"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendClientInvite } from "@/lib/email/auth-emails";
import { applyComplimentaryAccess } from "@/lib/watchlist/comp";

// Admin-created client accounts. Lets Rachel onboard someone with no payment and
// no credit card — the client sets their own password from an emailed link.
//
// Why auth.admin.generateLink and not inviteUserByEmail: the latter 422s with
// `email_exists` on a second call, so it cannot resend — and Supabase links
// expire in ~24h, which makes resend mandatory rather than optional. generateLink
// gives one code path for both, our own email copy, and a RELATIVE `next` (see
// the /auth/confirm sanitizer — an absolute one produces a dead host).

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

// Where an invitee lands: the profile page is the only set-password UI in the
// app. NOT /reset-password — that's the "email me a link" request form, and
// src/proxy.ts bounces authenticated users off it.
const INVITE_LANDING = "/dashboard/profile?welcome=1";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const p = profile as { role: string } | null;
  if (p?.role !== "admin") redirect("/dashboard");

  return supabase;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateClientInput {
  fullName: string;
  email: string;
  phone?: string;
  /** Email the branded invite now, or stay silent and use Resend invite later. */
  sendInvite: boolean;
  /** Also grant complimentary Job Alerts access. */
  grantWatchlist: boolean;
  compNote?: string;
  /** `yyyy-mm-dd` from a date input, or empty for no expiry. */
  compUntil?: string;
}

export interface CreateClientResult {
  error?: string;
  success?: boolean;
  clientId?: string;
  /** Set when the email already belongs to an account — the form links to it. */
  existingClientId?: string;
  inviteSent?: boolean;
  /** Populated when the account was created but the invite email failed. */
  inviteError?: string;
  watchlistGranted?: boolean;
  watchlistError?: string;
}

function buildConfirmUrl(hashedToken: string): string {
  return (
    `${APP_URL}/auth/confirm?token_hash=${hashedToken}` +
    `&type=invite&next=${encodeURIComponent(INVITE_LANDING)}`
  );
}

// A `yyyy-mm-dd` date input means "through the end of that day" locally. Anchor
// it to noon UTC so the sweep can't clip it a few hours early in Central time.
function compUntilToIso(raw: string | undefined): string | null {
  if (!raw) return null;
  const parsed = new Date(`${raw}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function createClientAccount(
  input: CreateClientInput
): Promise<CreateClientResult> {
  await requireAdmin();

  const fullName = input.fullName?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const phone = input.phone?.trim() || null;

  if (!fullName) return { error: "Enter the client's name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const service = createServiceClient();

  // Pre-check so the form can offer a link to the existing client instead of
  // surfacing a raw Supabase `email_exists` error.
  const { data: dupe } = await service
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (dupe) {
    return {
      error: "An account with that email already exists.",
      existingClientId: (dupe as { id: string }).id,
    };
  }

  // generateLink creates the auth user for type 'invite'. The handle_new_user()
  // trigger then writes the profiles row (role 'client', full_name from
  // raw_user_meta_data) — so we only need a follow-up update for phone.
  const { data, error } = await service.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name: fullName }, redirectTo: `${APP_URL}${INVITE_LANDING}` },
  });

  if (error || !data?.user) {
    console.error("[createClientAccount] generateLink failed:", error);
    const message = error?.message ?? "Could not create the account.";
    return {
      error: /already|exists|registered/i.test(message)
        ? "An account with that email already exists."
        : message,
    };
  }

  const clientId = data.user.id;
  const result: CreateClientResult = { success: true, clientId };

  // Backstop the trigger (and add phone, which it doesn't handle).
  const { error: profileErr } = await service
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", clientId);
  if (profileErr) console.error("[createClientAccount] profile update failed:", profileErr);

  if (input.grantWatchlist) {
    const {
      data: { user: admin },
    } = await (await createClient()).auth.getUser();
    const granted = await applyComplimentaryAccess(clientId, admin?.id ?? null, {
      note: input.compNote,
      until: compUntilToIso(input.compUntil),
    });
    if (granted.error) result.watchlistError = granted.error;
    else result.watchlistGranted = true;
  }

  if (input.sendInvite) {
    try {
      await sendClientInvite(email, fullName, buildConfirmUrl(data.properties.hashed_token));
      result.inviteSent = true;
    } catch (err) {
      // The account exists and is usable — don't fail the whole create over an
      // email hiccup. Rachel can press Resend invite.
      console.error("[createClientAccount] invite email failed:", err);
      result.inviteError = "Account created, but the invite email failed to send.";
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  return result;
}

export interface ResendInviteResult {
  error?: string;
  success?: boolean;
}

export async function resendClientInvite(clientId: string): Promise<ResendInviteResult> {
  await requireAdmin();

  const service = createServiceClient();

  const { data: authUser, error: lookupErr } = await service.auth.admin.getUserById(clientId);
  if (lookupErr || !authUser?.user) {
    return { error: "Could not find that account." };
  }
  if (authUser.user.email_confirmed_at) {
    return {
      error: "This client has already activated their account. Send a password reset instead.",
    };
  }

  const email = authUser.user.email;
  if (!email) return { error: "That account has no email address on file." };

  const { data: profile } = await service
    .from("profiles")
    .select("full_name")
    .eq("id", clientId)
    .maybeSingle();
  const fullName = (profile as { full_name: string | null } | null)?.full_name ?? "";

  // 'invite' 422s for a user that already exists, so a resend has to be a
  // magiclink. It confirms the email and creates a session the same way, which
  // is all the invitee needs to reach the set-password form.
  const { data, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${APP_URL}${INVITE_LANDING}` },
  });

  if (error || !data) {
    console.error("[resendClientInvite] generateLink failed:", error);
    return { error: error?.message ?? "Could not generate a new invite link." };
  }

  const confirmUrl =
    `${APP_URL}/auth/confirm?token_hash=${data.properties.hashed_token}` +
    `&type=magiclink&next=${encodeURIComponent(INVITE_LANDING)}`;

  try {
    await sendClientInvite(email, fullName, confirmUrl);
  } catch (err) {
    console.error("[resendClientInvite] email failed:", err);
    return { error: "Could not send the invite email." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}
