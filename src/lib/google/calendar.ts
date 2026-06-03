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
import { CENTRAL_TIMEZONE } from "@/lib/time/central";

export const GOOGLE_PROVIDER = "google_calendar";
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh if expiring within 5 min

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
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
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
}> {
  const service = createServiceClient();
  const { data } = await service
    .from("admin_integrations")
    .select("account_email, connected_at")
    .eq("provider", GOOGLE_PROVIDER)
    .maybeSingle();
  return {
    connected: !!data,
    accountEmail: data?.account_email ?? null,
    connectedAt: data?.connected_at ?? null,
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
  } catch {
    return null;
  }
}

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
}

export interface CalendarEventResult {
  eventId: string;
  meetLink: string | null;
}

const CALENDAR_TIMEZONE = CENTRAL_TIMEZONE;

export async function createCalendarEvent(args: CalendarEventArgs): Promise<CalendarEventResult | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const integration = await loadIntegration();
  const attendees: { email: string }[] = [];
  if (args.clientEmail) attendees.push({ email: args.clientEmail });
  if (integration?.account_email) attendees.push({ email: integration.account_email });

  const body = {
    summary: `${args.serviceType} — ${args.clientName}`,
    description: [
      `Service: ${args.serviceType}`,
      `Booking ID: ${args.bookingId}`,
      args.clientNotes ? `Client notes: ${args.clientNotes}` : null,
      `Admin record: ${args.appUrl}/admin/clients/${args.clientId ?? ""}#booking-${args.bookingId}`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: args.startIso, timeZone: CALENDAR_TIMEZONE },
    end: { dateTime: args.endIso, timeZone: CALENDAR_TIMEZONE },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: args.bookingId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: { useDefault: true },
  };

  try {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { id: string; hangoutLink?: string };
    return { eventId: json.id, meetLink: json.hangoutLink ?? null };
  } catch {
    return null;
  }
}
