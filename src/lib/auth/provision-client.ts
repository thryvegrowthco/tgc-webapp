// Create-or-find a client account for a paying checkout visitor.
//
// Context: public /signup is closed and, until now, only Rachel's admin invite
// (src/app/actions/clients.ts) created accounts. A visitor who paid at checkout
// without an account ended up with a booking but no way to see it. These helpers
// let the Stripe webhook provision a `client` account automatically.
//
// SECURITY: only call from the signature-verified Stripe webhook (or another
// already-trusted server context). This uses the service-role client, which
// bypasses RLS, and it creates confirmed, passwordless accounts. There is no
// public endpoint here. Role is always 'client', never 'admin', so migration
// 0038's protect_profile_role trigger stays respected. We also never link a
// booking to a profile that is not a 'client' (see findClientProfileByEmail).

import { createServiceClient } from "@/lib/supabase/service";
import { sendCheckoutWelcome } from "@/lib/email/auth-emails";

// Canonical host (www). The emailed setup link must resolve and set its auth
// cookies on the same origin the app serves from. NEXT_PUBLIC_APP_URL is the
// source of truth in every environment; this fallback only guards a missing env.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.thryvegrowth.co";

// Where a new payer lands after clicking their setup link: the profile page is
// the only set-password UI in the app (same destination the admin invite uses).
const SETUP_LANDING = "/dashboard/profile?welcome=1";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returned by findClientProfileByEmail when the email matches a profile that is
// NOT a client (e.g. an admin). The caller refuses to link in that case.
const NON_CLIENT = Symbol("non_client");

export interface EnsureClientAccountResult {
  /** The resolved (existing or newly created) profile id, or null on failure. */
  clientId: string | null;
  /** True only when THIS call created the account. */
  isNew: boolean;
  /**
   * True when the resolved account has never signed in (brand new, or an
   * existing account that was provisioned/invited but never activated). The
   * caller gates the passwordless setup welcome on this, not on isNew alone, so
   * an account that exists but has no password still gets its setup link, and a
   * created-but-email-failed account can be retried without the welcome being
   * silently skipped.
   */
  neverSignedIn: boolean;
  /** Set when the account could not be created; caller proceeds without a client_id. */
  error?: string;
}

/**
 * Find an existing client by email, or create a new confirmed, passwordless
 * `client` account. Matching is case-insensitive (emails are normalized to
 * lowercase, which is how Supabase Auth and the handle_new_user trigger store
 * them). Idempotent and race-tolerant: a concurrent create that loses to
 * `email_exists` re-reads and returns the existing account with `isNew: false`,
 * so at most one caller ever sees `isNew: true`.
 *
 * Never throws — on any failure it returns `{ clientId: null, isNew: false }`
 * plus an `error`, so the webhook can still finish the booking/payment.
 */
export async function ensureClientAccount(
  rawEmail: string,
  fullName: string
): Promise<EnsureClientAccountResult> {
  const email = rawEmail?.trim().toLowerCase() ?? "";
  const name = fullName?.trim() ?? "";
  if (!EMAIL_RE.test(email)) {
    return { clientId: null, isNew: false, neverSignedIn: false, error: "invalid_email" };
  }

  const service = createServiceClient();

  // ─── 1. Already have an account for this email? ──────────────────────────
  const existing = await findClientProfileByEmail(email);
  if (existing === NON_CLIENT) {
    return {
      clientId: null,
      isNew: false,
      neverSignedIn: false,
      error: "email_belongs_to_non_client",
    };
  }
  if (existing) {
    return {
      clientId: existing,
      isNew: false,
      neverSignedIn: await accountNeverSignedIn(existing),
    };
  }

  // ─── 2. Create it (email confirmed, no password, no public signup) ───────
  // The handle_new_user trigger writes the profiles row (role defaults to
  // 'client'); we pass full_name through raw_user_meta_data for it to pick up.
  const { data, error } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (error || !data?.user) {
    // The auth user already exists. This is a concurrent create that lost the
    // race, OR an auth user whose profiles row never got written. Resolve it
    // and treat it as existing (isNew stays false, so only the winning delivery
    // can send the welcome).
    if (/already|exists|registered/i.test(error?.message ?? "")) {
      const resolved = await resolveExistingAccount(email, name);
      if (resolved) return resolved;
    }
    console.error("[ensureClientAccount] createUser failed:", error?.message);
    return {
      clientId: null,
      isNew: false,
      neverSignedIn: false,
      error: error?.message ?? "create_failed",
    };
  }

  const clientId = data.user.id;

  // ─── 3. Backstop the trigger: guarantee a 'client' profiles row + name ───
  // The trigger normally handles this, but if it ever did not fire we must not
  // leave a dangling auth user. role is pinned to 'client' (never 'admin').
  const { error: upsertErr } = await service
    .from("profiles")
    .upsert(
      { id: clientId, email, full_name: name || null, role: "client" },
      { onConflict: "id" }
    );
  if (upsertErr) {
    console.error("[ensureClientAccount] profile backstop failed:", upsertErr.message);
  }

  return { clientId, isNew: true, neverSignedIn: true };
}

/**
 * Look up a profile by email and return its id ONLY when it is a `client`.
 *
 * SECURITY: the email here was typed by the payer in an unauthenticated
 * checkout, so we must never auto-link a booking to an existing account unless
 * that account is a client. If the email matches an admin (or any non-client)
 * profile we return NON_CLIENT so the caller refuses and alerts Rachel instead:
 * a self-typed email must not attach a payment to, or hand a stranger access
 * to, a privileged account.
 *
 * Selects `role` and filters in TypeScript rather than `.eq('role', 'client')`,
 * because `.eq()` on a union-literal column narrows the typed result to `never`
 * (see CLAUDE.md).
 */
async function findClientProfileByEmail(
  email: string
): Promise<string | typeof NON_CLIENT | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();
  const row = data as { id: string; role: string } | null;
  if (!row) return null;
  if (row.role !== "client") return NON_CLIENT;
  return row.id;
}

/** True when the account has never signed in (no password set yet). */
async function accountNeverSignedIn(userId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.getUserById(userId);
  // Unknown state: do not trigger the setup welcome, so we never nag an account
  // we cannot read.
  if (error || !data?.user) return false;
  return !data.user.last_sign_in_at;
}

/**
 * Resolve an account whose email already exists in Supabase Auth, for the
 * `email_exists` branch of createUser. Returns null only when the user cannot
 * be resolved at all (caller then surfaces create_failed).
 */
async function resolveExistingAccount(
  email: string,
  name: string
): Promise<EnsureClientAccountResult | null> {
  const service = createServiceClient();

  // Usual case: the profiles row is present (a concurrent delivery won the race).
  const existing = await findClientProfileByEmail(email);
  if (existing === NON_CLIENT) {
    return {
      clientId: null,
      isNew: false,
      neverSignedIn: false,
      error: "email_belongs_to_non_client",
    };
  }
  if (existing) {
    return {
      clientId: existing,
      isNew: false,
      neverSignedIn: await accountNeverSignedIn(existing),
    };
  }

  // The auth user exists but has NO profiles row (the handle_new_user trigger
  // never fired). Resolve the id WITHOUT scanning every user: generateLink with
  // type 'recovery' returns the existing user's record for this email and sends
  // nothing (we never use the link). Then backstop the missing 'client' row.
  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (error || !data?.user) {
    console.error(
      "[ensureClientAccount] could not resolve existing auth user:",
      error?.message
    );
    return null;
  }
  const userId = data.user.id;
  const { error: upsertErr } = await service
    .from("profiles")
    .upsert(
      { id: userId, email, full_name: name || null, role: "client" },
      { onConflict: "id" }
    );
  if (upsertErr) {
    console.error(
      "[ensureClientAccount] profile backstop (email_exists) failed:",
      upsertErr.message
    );
  }
  return { clientId: userId, isNew: false, neverSignedIn: !data.user.last_sign_in_at };
}

export interface CheckoutWelcomeContext {
  serviceType: string;
  amountFormatted: string;
}

/** Outcome of a setup-welcome attempt. `failed` tells the webhook to alert Rachel. */
export type CheckoutWelcomeOutcome = "sent" | "skipped" | "failed";

/**
 * Email a payer who has no password yet ONE welcome message: their receipt
 * context plus a secure, one-time link to set a password and reach their
 * portal. The link is a Supabase recovery link generated here; it is never
 * returned or logged.
 *
 * Idempotent per checkout: pass `stripeSessionId` and the send is logged under
 * a stable key in `automation_log`, so a replayed webhook (or any second call
 * for the same session) short-circuits instead of sending a second email.
 *
 * Best-effort and never throws. Returns `"failed"` on a generateLink or send
 * error (including the `{ error }` Resend v6 returns instead of throwing) so the
 * caller can alert Rachel, `"skipped"` when already sent for this session, and
 * `"sent"` on success.
 */
export async function sendCheckoutAccountWelcome(
  rawEmail: string,
  fullName: string,
  ctx: CheckoutWelcomeContext,
  stripeSessionId?: string,
  clientId?: string | null
): Promise<CheckoutWelcomeOutcome> {
  const email = rawEmail?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) return "failed";

  const service = createServiceClient();
  const eventKey = stripeSessionId ? `checkout_welcome:${stripeSessionId}` : null;

  // ─── Idempotency: never send a second setup email for the same checkout ───
  if (eventKey) {
    try {
      const { data: already } = await service
        .from("automation_log")
        .select("id")
        .eq("event_key", eventKey)
        .eq("status", "success")
        .maybeSingle();
      if (already) return "skipped";
    } catch {
      // A log-read failure must not block a first send; fall through.
    }
  }

  // A recovery link logs the user in and drops them on the set-password page.
  // We build our own /auth/confirm URL from the hashed token (relative `next`),
  // exactly as the admin invite flow does. A generateLink failure is a hard
  // failure: without a link there is no usable setup email.
  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${APP_URL}${SETUP_LANDING}` },
  });

  if (error || !data?.properties?.hashed_token) {
    console.error("[sendCheckoutAccountWelcome] generateLink failed:", error?.message);
    return "failed";
  }

  const setupUrl =
    `${APP_URL}/auth/confirm?token_hash=${data.properties.hashed_token}` +
    `&type=recovery&next=${encodeURIComponent(SETUP_LANDING)}`;

  // Resend v6 returns `{ error }` instead of throwing, so an unchecked result
  // would report a failed send as success. Inspect both the thrown and the
  // returned error. The setup link is never logged.
  let sendError: string | null = null;
  try {
    const res = await sendCheckoutWelcome(email, fullName?.trim() ?? "", setupUrl, ctx);
    if (res && res.error) sendError = res.error.message ?? "resend_error";
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err);
  }

  if (sendError) {
    console.error("[sendCheckoutAccountWelcome] email send failed:", sendError);
    return "failed";
  }

  // Mark sent so replays short-circuit above. Best-effort: a log-write failure
  // does not un-send the email, so we still report success.
  if (eventKey) {
    try {
      await service.from("automation_log").insert({
        event_key: eventKey,
        client_id: clientId ?? null,
        status: "success",
        payload: { template_key: "checkout_welcome" },
      });
    } catch {
      // Logging must not change the send result.
    }
  }

  return "sent";
}
