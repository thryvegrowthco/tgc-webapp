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

// automation_log event keys for calendar auth health (no booking_id, so they
// are never deduped by the (event_key, booking_id) unique index).
const AUTH_FAILED_EVENT = "google_calendar_auth_failed";
const AUTH_NOTIFIED_EVENT = "google_calendar_auth_notified";
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

    await createAdminNotification({
      // Reuse an existing, prod-allowed "needs attention" type so the bell works
      // without a schema change.
      type: "subscription_issue",
      title: "Google Calendar is disconnected",
      body: "Reconnect it in Integrations so new sessions get calendar invites and Meet links.",
      link: "/admin/integrations",
    });
    await service.from("automation_log").insert({ event_key: AUTH_NOTIFIED_EVENT, status: "success" });
  } catch {
    // Visibility is best-effort: a logging failure must not break calendar flow.
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
    .select("account_email, connected_at")
    .eq("provider", GOOGLE_PROVIDER)
    .maybeSingle();
  const connectedAt = data?.connected_at ?? null;

  let lastFailureAt: string | null = null;
  const { data: fail } = await service
    .from("automation_log")
    .select("created_at")
    .eq("event_key", AUTH_FAILED_EVENT)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  lastFailureAt = (fail as { created_at: string } | null)?.created_at ?? null;

  const reconnectNeeded =
    !!data &&
    !!lastFailureAt &&
    (!connectedAt || new Date(lastFailureAt).getTime() > new Date(connectedAt).getTime());

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
    // Refresh failed (expired/revoked refresh token, or a transient Google
    // error). Surface it so admins can reconnect; degrade to null either way.
    if (err instanceof GoogleAuthError) {
      await recordAuthFailure(err.status, err.code);
    } else {
      await recordAuthFailure(null, null);
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
      // A rejected token here (vs at refresh) also means Rachel must reconnect.
      if (res.status === 401 || res.status === 403) {
        await recordAuthFailure(res.status, "event_create_rejected");
      }
      return null;
    }
    const json = (await res.json()) as { id: string; hangoutLink?: string; htmlLink?: string };
    return { eventId: json.id, meetLink: json.hangoutLink ?? null, htmlLink: json.htmlLink ?? null };
  } catch {
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
