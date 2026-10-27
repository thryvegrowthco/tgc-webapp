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
// 0038's protect_profile_role trigger stays respected.

import { createServiceClient } from "@/lib/supabase/service";
import { sendCheckoutWelcome } from "@/lib/email/auth-emails";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

// Where a new payer lands after clicking their setup link: the profile page is
// the only set-password UI in the app (same destination the admin invite uses).
const SETUP_LANDING = "/dashboard/profile?welcome=1";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EnsureClientAccountResult {
  /** The resolved (existing or newly created) profile id, or null on failure. */
  clientId: string | null;
  /** True only when THIS call created the account — gate the welcome email on it. */
  isNew: boolean;
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
    return { clientId: null, isNew: false, error: "invalid_email" };
  }

  const service = createServiceClient();

  // ─── 1. Already have an account for this email? ──────────────────────────
  const existing = await findProfileByEmail(email);
  if (existing) return { clientId: existing, isNew: false };

  // ─── 2. Create it (email confirmed, no password, no public signup) ───────
  // The handle_new_user trigger writes the profiles row (role defaults to
  // 'client'); we pass full_name through raw_user_meta_data for it to pick up.
  const { data, error } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (error || !data?.user) {
    // Race: a concurrent webhook delivery created the account between our check
    // and this insert. Re-read and treat it as existing (isNew stays false, so
    // only the winning delivery sends the welcome email).
    if (/already|exists|registered/i.test(error?.message ?? "")) {
      const raced = await findProfileByEmail(email);
      if (raced) return { clientId: raced, isNew: false };
    }
    console.error("[ensureClientAccount] createUser failed:", error?.message);
    return { clientId: null, isNew: false, error: error?.message ?? "create_failed" };
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

  return { clientId, isNew: true };
}

async function findProfileByEmail(email: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export interface CheckoutWelcomeContext {
  serviceType: string;
  amountFormatted: string;
}

/**
 * Email a freshly created payer ONE welcome message: their receipt context plus
 * a secure, one-time link to set a password and reach their portal. The link is
 * a Supabase recovery link generated here; it is never returned or logged.
 *
 * Best-effort: returns false on any failure. Only call when the account was just
 * created (`isNew`), so a replayed webhook (which short-circuits before this) and
 * existing-account payers never receive it. Never throws.
 */
export async function sendCheckoutAccountWelcome(
  rawEmail: string,
  fullName: string,
  ctx: CheckoutWelcomeContext
): Promise<boolean> {
  const email = rawEmail?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) return false;

  const service = createServiceClient();

  // A recovery link logs the user in and drops them on the set-password page.
  // We build our own /auth/confirm URL from the hashed token (relative `next`),
  // exactly as the admin invite flow does.
  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${APP_URL}${SETUP_LANDING}` },
  });

  if (error || !data?.properties?.hashed_token) {
    console.error("[sendCheckoutAccountWelcome] generateLink failed:", error?.message);
    return false;
  }

  const setupUrl =
    `${APP_URL}/auth/confirm?token_hash=${data.properties.hashed_token}` +
    `&type=recovery&next=${encodeURIComponent(SETUP_LANDING)}`;

  try {
    await sendCheckoutWelcome(email, fullName?.trim() ?? "", setupUrl, ctx);
    return true;
  } catch (err) {
    // Deliberately log only the message, never the setup link.
    console.error(
      "[sendCheckoutAccountWelcome] email send failed:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}
