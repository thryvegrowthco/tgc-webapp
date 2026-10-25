// Google Calendar integration helper.
//
// Two responsibilities:
//   1. Token storage: lazy access-token refresh via the stored refresh token.
//      Tokens are encrypted at rest via INTEGRATIONS_ENCRYPTION_KEY (AES-GCM).
//   2. Event creation: when a booking is paid, create a calendar event with a
//      Google Meet link and store the link + event ID on the booking row.
//
// Failure mode: every public function catches errors and degrades gracefully —
// the webhook flips `meet_link_pending = TRUE` so the admin UI surfaces a
// "manual link needed" banner. Booking creation never blocks on Calendar API.

import { createServiceClient } from "@/lib/supabase/service";
import { encrypt, decrypt } from "@/lib/crypto/aes";
import { createAdminNotification } from "@/lib/notifications/admin";
import { CENTRAL_TIMEZONE } from "@/lib/time/central";

export const GOOGLE_PROVIDER = "google_calendar";
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh if expiring within 5 min

// automation_log event keys for calendar health (no booking_id, so they are
// never deduped by the (event_key, booking_id) unique index).
const AUTH_FAILED_EVENT = "google_calendar_auth_failed";
const AUTH_NOTIFIED_EVENT = "google_calendar_auth_notified";
const TRANSIENT_EVENT = "google_calendar_transient_error";
// A successful calendar event (created on booking or via retry) proves the
// connection works again — used by getIntegrationStatus to clear a stale state.
const EVENT_CREATED_EVENT = "calendar_event_created";
const NOTIFY_THROTTLE_MS = 24 * 60 * 60 * 1000; // bell at most once per day

/** A Google auth/refresh error carrying the HTTP status + Google error code. */
class GoogleAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null
  ) {
    super(`Google token refresh failed (${status})${code ? `: ${code}` : ""}`);
    this.name = "GoogleAuthError";
  }
}

// Google OAuth error codes that mean the stored grant is dead and Rachel must
// re-consent. Anything else (5xx, 429, 403 quota, network) is transient.
const REAUTH_ERROR_CODES = new Set(["invalid_grant", "invalid_client", "unauthorized_client"]);

export type GoogleErrorClass = "auth" | "transient";

/**
 * Classify a Google token-refresh / Calendar API failure. Pure + exported so it
 * can be unit-tested. Only genuine auth failures should drive the "Reconnect
 * needed" state; transient errors (network, timeout, Google 5xx, 403/429
 * rate-limit/quota) must not.
 *
 *   - token_refresh: a dead grant only when the HTTP status is 400/401 AND the
 *     body carries an invalid_grant / invalid_client / unauthorized_client code.
 *   - calendar_api: only a 401 (token rejected) is an auth failure; 403/429/5xx
 *     are transient.
 *   - a null status (network error / timeout) is always transient.
 */
export function classifyGoogleError(args: {
  source: "token_refresh" | "calendar_api";
  status: number | null;
  code: string | null;
}): GoogleErrorClass {
  const { source, status, code } = args;
  if (status === null) return "transient";
  if (source === "token_refresh") {
    if ((status === 400 || status === 401) && code !== null && REAUTH_ERROR_CODES.has(code)) {
      return "auth";
    }
    return "transient";
  }
  // calendar_api
  return status === 401 ? "auth" : "transient";
}

/**
 * Record a Google Calendar auth failure so admins can see it, and nudge Rachel
 * (at most once per day) to reconnect. Stores only the HTTP status and Google
 * error code, never tokens. Best-effort: never throws into the caller.
 */
async function recordAuthFailure(status: number | null, code: string | null): Promise<void> {
  try {
    const service = createServiceClient();
    await service.from("automation_log").insert({
      event_key: AUTH_FAILED_EVENT,
      status: "failed",
      error_message: `Google Calendar auth failed${status ? ` (HTTP ${status})` : ""}${code ? ` [${code}]` : ""}`,
      payload: { http_status: status, google_error: code },
    });

    // Throttle the admin bell: skip if we already notified within the window.
    const since = new Date(Date.now() - NOTIFY_THROTTLE_MS).toISOString();
    const { data: recent } = await service
      .from("automation_log")
      .select("id")
      .eq("event_key", AUTH_NOTIFIED_EVENT)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (recent) return;

    // Write the throttle marker BEFORE sending the bell so a near-concurrent
    // failure is more likely to see it and skip — the closest we can get to a
    // race-safe once-per-day dedupe without a schema change. If the bell insert
    // then fails, delete the marker so the next attempt isn't wrongly suppressed.
    const { data: marker } = await service
      .from("automation_log")
      .insert({ event_key: AUTH_NOTIFIED_EVENT, status: "success" })
      .select("id")
      .maybeSingle();

    const notified = await createAdminNotification({
      // Dedicated type (not subscription_issue) so a disconnected calendar is
      // never silenced by the subscription notification preference, and reads
      // correctly in the bell.
      type: "calendar_issue",
      title: "Google Calendar is disconnected",
      body: "Reconnect it in Integrations so new sessions get calendar invites and Meet links.",
      link: "/admin/integrations",
    });

    if (!notified && marker?.id) {
      await service.from("automation_log").delete().eq("id", marker.id);
    }
  } catch {
    // Visibility is best-effort: a logging failure must not break calendar flow.
  }
}

/**
 * Record a transient Google Calendar error (network, timeout, 5xx, 403/429
 * rate-limit/quota). Logged for visibility but deliberately does NOT trigger
 * the admin bell or the "Reconnect needed" state — these recover on their own.
 * Best-effort: never throws into the caller.
 */
async function recordTransientError(status: number | null, code: string | null): Promise<void> {
  try {
    const service = createServiceClient();
    await service.from("automation_log").insert({
      event_key: TRANSIENT_EVENT,
      status: "failed",
      error_message: `Google Calendar transient error${status ? ` (HTTP ${status})` : ""}${code ? ` [${code}]` : ""}`,
      payload: { http_status: status, google_error: code },
    });
  } catch {
    // Visibility is best-effort.
  }
}

interface StoredIntegration {
  account_email: string | null;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string | null;
  scope: string | null;
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} is not set`);
  return val;
}

export function getOAuthClientConfig() {
  return {
    clientId: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirectUri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
  };
}

export function buildAuthUrl(state: string): string {
  const cfg = getOAuthClientConfig();
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

async function exchangeCode(code: string): Promise<TokenResponse> {
  const cfg = getOAuthClientConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const cfg = getOAuthClientConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    let code: string | null = null;
    try {
      code = (JSON.parse(text) as { error?: string }).error ?? null;
    } catch {
      // Non-JSON error body: keep the status, drop the code.
    }
    throw new GoogleAuthError(res.status, code);
  }
  return (await res.json()) as TokenResponse;
}

async function fetchAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}

export async function persistInitialTokens(args: {
  code: string;
  adminUserId: string;
}): Promise<{ email: string | null }> {
  const tokens = await exchangeCode(args.code);
  if (!tokens.refresh_token) {
    throw new Error("No refresh_token returned. Re-consent with prompt=consent.");
  }
  const email = await fetchAccountEmail(tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const service = createServiceClient();
  await service.from("admin_integrations").upsert(
    {
      provider: GOOGLE_PROVIDER,
      account_email: email,
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: encrypt(tokens.refresh_token),
      access_token_expires_at: expiresAt,
      scope: tokens.scope ?? GOOGLE_SCOPE,
      connected_by: args.adminUserId,
      // Stamp connected_at on reconnect too (onConflict UPDATE keeps the old
      // value otherwise) so the "Reconnect needed" state clears: any auth
      // failure logged before this moment is now older than connected_at.
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" }
  );

  return { email };
}

export async function disconnectIntegration(): Promise<void> {
  const service = createServiceClient();
  await service.from("admin_integrations").delete().eq("provider", GOOGLE_PROVIDER);
}

export async function getIntegrationStatus(): Promise<{
  connected: boolean;
  accountEmail: string | null;
  connectedAt: string | null;
  /** True when the latest auth failure is newer than the last (re)connect. */
  reconnectNeeded: boolean;
  lastFailureAt: string | null;
}> {
  const service = createServiceClient();
  const { data } = await service
    .from("admin_integrations")
    .select("account_email, connected_at, updated_at")
    .eq("provider", GOOGLE_PROVIDER)
    .maybeSingle();
  const connectedAt = data?.connected_at ?? null;
  // updated_at advances on every successful token refresh (and on reconnect),
  // so it marks the last time the connection provably worked.
  const lastRefreshAt = (data as { updated_at?: string | null } | null)?.updated_at ?? null;

  let lastFailureAt: string | null = null;
  const { data: fail } = await service
    .from("automation_log")
    .select("created_at")
    .eq("event_key", AUTH_FAILED_EVENT)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  lastFailureAt = (fail as { created_at: string } | null)?.created_at ?? null;

  // A calendar event that succeeded after a failure (e.g. a retry) also proves
  // the connection recovered.
  const { data: ok } = await service
    .from("automation_log")
    .select("created_at")
    .eq("event_key", EVENT_CREATED_EVENT)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastSuccessAt = (ok as { created_at: string } | null)?.created_at ?? null;

  // The most recent moment the connection is known to have worked: a reconnect,
  // a successful token refresh, or a successful calendar event. "Reconnect
  // needed" only when the latest auth failure is newer than ALL of these.
  const goodTimes = [connectedAt, lastRefreshAt, lastSuccessAt]
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime());
  const lastGoodAt = goodTimes.length ? Math.max(...goodTimes) : null;

  const reconnectNeeded =
    !!data &&
    !!lastFailureAt &&
    (lastGoodAt === null || new Date(lastFailureAt).getTime() > lastGoodAt);

  return {
    connected: !!data,
    accountEmail: data?.account_email ?? null,
    connectedAt,
    reconnectNeeded,
    lastFailureAt,
  };
}

async function loadIntegration(): Promise<StoredIntegration | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("admin_integrations")
    .select("account_email, access_token_encrypted, refresh_token_encrypted, access_token_expires_at, scope")
    .eq("provider", GOOGLE_PROVIDER)
    .maybeSingle();
  if (!data) return null;
  try {
    return {
      account_email: data.account_email,
      access_token: decrypt(data.access_token_encrypted),
      refresh_token: decrypt(data.refresh_token_encrypted),
      access_token_expires_at: data.access_token_expires_at,
      scope: data.scope,
    };
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  const integration = await loadIntegration();
  if (!integration) return null;

  const expiresAt = integration.access_token_expires_at
    ? new Date(integration.access_token_expires_at).getTime()
    : 0;

  if (expiresAt - Date.now() > TOKEN_REFRESH_THRESHOLD_MS) {
    return integration.access_token;
  }

  try {
    const fresh = await refreshAccessToken(integration.refresh_token);
    const service = createServiceClient();
    const newExpiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    await service
      .from("admin_integrations")
      .update({
        access_token_encrypted: encrypt(fresh.access_token),
        // Google sometimes returns a new refresh_token; keep it if so.
        refresh_token_encrypted: fresh.refresh_token
          ? encrypt(fresh.refresh_token)
          : encrypt(integration.refresh_token),
        access_token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("provider", GOOGLE_PROVIDER);
    return fresh.access_token;
  } catch (err) {
    // Refresh failed. Only a dead grant (invalid_grant/_client, 400/401) is a
    // real auth failure that should nudge Rachel to reconnect; a network error
    // or a transient Google error must not. Degrade to null either way.
    if (err instanceof GoogleAuthError) {
      const cls = classifyGoogleError({ source: "token_refresh", status: err.status, code: err.code });
      if (cls === "auth") await recordAuthFailure(err.status, err.code);
      else await recordTransientError(err.status, err.code);
    } else {
      // Network error, timeout, or a malformed response — transient.
      await recordTransientError(null, null);
    }
    return null;
  }
}

export type CalendarLocationType = "google_meet" | "phone" | "in_person" | "custom";

export interface CalendarEventArgs {
  bookingId: string;
  serviceType: string;
  clientName: string;
  clientEmail: string;
  clientNotes: string | null;
  startIso: string;
  endIso: string;
  appUrl: string;
  clientId: string | null;
  /** Defaults to "google_meet" (existing /book behavior). Only google_meet creates a Meet link. */
  locationType?: CalendarLocationType;
  /** Phone number, address, or custom instructions — used for non-Meet location types. */
  locationDetails?: string | null;
}

// Human label for the event `location` field on non-Meet sessions.
export function locationLabel(type: CalendarLocationType, details: string | null | undefined): string | null {
  switch (type) {
    case "phone":
      return details ? `Phone: ${details}` : "Phone call";
    case "in_person":
      return details || "In person";
    case "custom":
      return details || null;
    default:
      return null;
  }
}

export interface CalendarEventResult {
  eventId: string;
  meetLink: string | null;
  htmlLink: string | null;
}

const CALENDAR_TIMEZONE = CENTRAL_TIMEZONE;

export async function createCalendarEvent(args: CalendarEventArgs): Promise<CalendarEventResult | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const integration = await loadIntegration();
  const attendees: { email: string }[] = [];
  if (args.clientEmail) attendees.push({ email: args.clientEmail });
  if (integration?.account_email) attendees.push({ email: integration.account_email });

  const locationType: CalendarLocationType = args.locationType ?? "google_meet";
  const useMeet = locationType === "google_meet";
  const location = locationLabel(locationType, args.locationDetails);

  const body: Record<string, unknown> = {
    summary: `${args.serviceType}: ${args.clientName}`,
    description: [
      `Service: ${args.serviceType}`,
      `Booking ID: ${args.bookingId}`,
      args.clientNotes ? `Client notes: ${args.clientNotes}` : null,
      !useMeet && location ? `Location: ${location}` : null,
      `Admin record: ${args.appUrl}/admin/clients/${args.clientId ?? ""}#booking-${args.bookingId}`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: args.startIso, timeZone: CALENDAR_TIMEZONE },
    end: { dateTime: args.endIso, timeZone: CALENDAR_TIMEZONE },
    attendees,
    reminders: { useDefault: true },
  };

  // Only Google Meet sessions request a conference link. Other location types
  // carry their details in the event `location` field instead.
  if (useMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: args.bookingId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  } else if (location) {
    body.location = location;
  }

  // conferenceDataVersion is only needed when creating a Meet conference.
  const url = useMeet
    ? "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all"
    : "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // A 401 here (vs at refresh) also means Rachel must reconnect. A 403/429
      // (rate-limit/quota) or 5xx is transient and must NOT flag a reconnect.
      if (classifyGoogleError({ source: "calendar_api", status: res.status, code: null }) === "auth") {
        await recordAuthFailure(res.status, "event_create_rejected");
      } else {
        await recordTransientError(res.status, "event_create_failed");
      }
      return null;
    }
    const json = (await res.json()) as { id: string; hangoutLink?: string; htmlLink?: string };
    return { eventId: json.id, meetLink: json.hangoutLink ?? null, htmlLink: json.htmlLink ?? null };
  } catch {
    // Network error / timeout / malformed response — transient, not a reconnect.
    await recordTransientError(null, null);
    return null;
  }
}

/**
 * Patch an existing calendar event. Every field is optional — only the ones
 * provided are sent, so this covers both a reschedule (start/end) and a
 * logistics edit (location/summary/description). The Meet link and attendees
 * are preserved. Returns true on success — callers treat false as "fall back
 * to creating a fresh event" (reschedule) or "best-effort, ignore" (edit).
 */
export async function updateCalendarEvent(
  eventId: string,
  args: {
    startIso?: string;
    endIso?: string;
    /** Event `location` text. Pass "" to clear (e.g. switching to Google Meet). */
    location?: string | null;
    summary?: string;
    description?: string;
  }
): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  const body: Record<string, unknown> = {};
  if (args.startIso) body.start = { dateTime: args.startIso, timeZone: CALENDAR_TIMEZONE };
  if (args.endIso) body.end = { dateTime: args.endIso, timeZone: CALENDAR_TIMEZONE };
  if (args.location !== undefined) body.location = args.location ?? "";
  if (args.summary !== undefined) body.summary = args.summary;
  if (args.description !== undefined) body.description = args.description;
  if (Object.keys(body).length === 0) return true;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Cancel an existing calendar event (used when a session is cancelled). */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    // 410 = already deleted; treat as success.
    return res.ok || res.status === 410;
  } catch {
    return false;
  }
}
