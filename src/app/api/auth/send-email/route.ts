import { createHmac, timingSafeEqual } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import {
  sendSignupConfirmation,
  sendClientInvite,
  sendPasswordReset,
  sendEmailChange,
  sendMagicLink,
} from "@/lib/email/auth-emails";

// Supabase "Send Email" Auth Hook handler.
// Configured in: Supabase Dashboard → Authentication → Hooks → Send Email
// The hook POSTs here whenever Supabase needs to send an auth email.

// Extract the raw HMAC key bytes from a Supabase hook secret.
// Supabase stores the secret as "v1,whsec_<base64>"; the HMAC key is the
// base64-decoded portion after `whsec_`.
function extractSecretBytes(secret: string): Buffer {
  const afterPrefix = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
  return Buffer.from(afterPrefix, "base64");
}

// Verifies a Standard Webhooks signature — the format Supabase Auth Hooks use
// since GA. Signature header format: "v1,<base64> v1,<base64> ..." (multiple
// signatures may be present during key rotation). Signed payload is
// `${webhook_id}.${webhook_timestamp}.${raw_body}`.
function verifyStandardWebhook(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
  secret: string,
): boolean {
  try {
    const secretBytes = extractSecretBytes(secret);
    const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
    const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
    const expectedBuf = Buffer.from(expected, "base64");

    for (const sig of webhookSignature.split(" ")) {
      const [version, value] = sig.split(",");
      if (version !== "v1" || !value) continue;
      const providedBuf = Buffer.from(value, "base64");
      if (providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Legacy fallback: HMAC-SHA256 hex of the raw body, compared as `v1,<hex>`.
function verifyLegacySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const expectedBuf = Buffer.from(`v1,${expected}`);
    const sigBuf = Buffer.from(signature);
    if (expectedBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

// Reduce an absolute redirect target to a path (see the `next` comment below).
// Returns null for anything empty or unparseable so the caller can default.
function toPath(raw: string | undefined | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const parsed = new URL(raw);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

interface HookPayload {
  user: {
    email: string;
    user_metadata?: { full_name?: string };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    site_url: string;
    email_action_type: "signup" | "recovery" | "invite" | "email_change" | "magiclink";
    new_email?: string;
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (!secret) {
    console.error("SUPABASE_HOOK_SECRET is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const rawBody = await request.text();
  const webhookId = request.headers.get("webhook-id");
  const webhookTimestamp = request.headers.get("webhook-timestamp");
  const webhookSignature = request.headers.get("webhook-signature");
  const legacySignature = request.headers.get("x-supabase-signature");

  let verified = false;
  if (webhookId && webhookTimestamp && webhookSignature) {
    verified = verifyStandardWebhook(rawBody, webhookId, webhookTimestamp, webhookSignature, secret);
  } else if (legacySignature) {
    verified = verifyLegacySignature(rawBody, legacySignature, secret);
  }

  if (!verified) {
    console.error("Hook signature verification failed", {
      hasStandardWebhookHeaders: Boolean(webhookId && webhookTimestamp && webhookSignature),
      hasLegacyHeader: Boolean(legacySignature),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { user, email_data } = payload;
  const email = user.email;
  const name = user.user_metadata?.full_name ?? "";
  const { token_hash, email_action_type, redirect_to, site_url, new_email } = email_data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? site_url;

  // Determine post-confirmation destination.
  //
  // `redirect_to` is whatever was passed as emailRedirectTo — usually an ABSOLUTE
  // url. /auth/confirm concatenates `origin + next`, so an absolute value here
  // produces a dead host. Reduce it to a path before it ever reaches the link.
  //
  // Recovery goes to /dashboard/profile, NOT /reset-password: that page is the
  // "email me a link" REQUEST form, and src/proxy.ts lists it in AUTH_ROUTES, so
  // an authenticated user (verifyOtp creates a session) is bounced to /dashboard
  // and never sees a password field. The set-password UI lives on the profile page.
  const next =
    email_action_type === "recovery" ? "/dashboard/profile" : toPath(redirect_to) ?? "/dashboard";

  const confirmUrl = `${appUrl}/auth/confirm?token_hash=${token_hash}&type=${email_action_type}&next=${encodeURIComponent(next)}`;

  try {
    switch (email_action_type) {
      case "signup":
        await sendSignupConfirmation(email, name, confirmUrl);
        break;
      // An invite means an admin created the account for them — "confirm the
      // account you just made" is the wrong story, so it gets its own copy.
      case "invite":
        await sendClientInvite(email, name, confirmUrl);
        break;
      case "recovery":
        await sendPasswordReset(email, name, confirmUrl);
        break;
      case "email_change":
        await sendEmailChange(email, new_email ?? email, confirmUrl);
        break;
      case "magiclink":
        await sendMagicLink(email, name, confirmUrl);
        break;
      default:
        // Unknown type — let Supabase fall back to its default
        return NextResponse.json({}, { status: 200 });
    }
  } catch (err) {
    console.error("Failed to send auth email:", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({}, { status: 200 });
}
