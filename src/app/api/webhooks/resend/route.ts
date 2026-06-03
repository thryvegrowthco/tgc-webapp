// Resend webhook handler.
//
// Resend uses Svix infrastructure for webhook delivery. We verify the
// Svix-signed payload manually via HMAC-SHA256 (no extra deps), then
// idempotently upsert into newsletter_events.
//
// The webhook secret (env: RESEND_WEBHOOK_SECRET) starts with "whsec_" and
// is shown in the Resend dashboard when you create a webhook endpoint.

import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    click?: { link?: string; ipAddress?: string; userAgent?: string };
    bounce?: { type?: string; subType?: string };
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // In dev, allow without verification but log loudly. In prod, the env
    // should be set and this branch should never run.
    console.warn("[resend-webhook] RESEND_WEBHOOK_SECRET not set; skipping signature verification");
  } else {
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing signature headers", { status: 401 });
    }
    if (!verifySvixSignature({ id: svixId, timestamp: svixTimestamp, signature: svixSignature, body: rawBody, secret })) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ResendWebhookEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = mapEventType(event.type);
  if (!eventType) {
    return Response.json({ ok: true, ignored: event.type });
  }

  const resendMessageId = event.data?.email_id;
  if (!resendMessageId) {
    return Response.json({ ok: true, skipped: "no email_id" });
  }

  const supabase = createServiceClient();

  // Find the send row to correlate back to issue + subscriber
  const { data: sendRow } = await supabase
    .from("newsletter_sends")
    .select("id, issue_id, subscriber_id")
    .eq("resend_message_id", resendMessageId)
    .maybeSingle();

  const send = sendRow as { id: string; issue_id: string; subscriber_id: string } | null;

  // Idempotent upsert (UNIQUE on resend_event_id)
  const resendEventId = svixId ?? `${event.type}:${resendMessageId}:${event.created_at}`;

  const url = event.data?.click?.link ?? null;
  const userAgent = event.data?.click?.userAgent ?? null;

  const { error: insertError } = await supabase.from("newsletter_events").insert({
    send_id: send?.id ?? null,
    subscriber_id: send?.subscriber_id ?? null,
    issue_id: send?.issue_id ?? null,
    event_type: eventType,
    url,
    user_agent: userAgent,
    occurred_at: event.created_at,
    resend_event_id: resendEventId,
  });

  // Ignore unique-constraint violations (retried event)
  if (insertError && insertError.code !== "23505") {
    console.error("[resend-webhook] insert failed:", insertError);
  }

  // Side effects per event type
  if (send?.subscriber_id) {
    if (eventType === "opened" || eventType === "clicked") {
      await supabase
        .from("newsletter_subscribers")
        .update({ last_engaged_at: event.created_at })
        .eq("id", send.subscriber_id);
    } else if (eventType === "bounced" || eventType === "complained") {
      await supabase
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("id", send.subscriber_id)
        .is("unsubscribed_at", null);
    }
  }

  return Response.json({ ok: true, type: eventType });
}

type NewsletterEventType =
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed";

function mapEventType(resendType: string): NewsletterEventType | null {
  switch (resendType) {
    case "email.delivered":   return "delivered";
    case "email.opened":      return "opened";
    case "email.clicked":     return "clicked";
    case "email.bounced":     return "bounced";
    case "email.complained":  return "complained";
    default:                  return null;
  }
}

function verifySvixSignature(input: {
  id: string;
  timestamp: string;
  signature: string;
  body: string;
  secret: string;
}): boolean {
  // Svix secret format: whsec_<base64>
  const secretKey = input.secret.startsWith("whsec_") ? input.secret.slice(6) : input.secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(secretKey, "base64");
  } catch {
    return false;
  }

  const signedPayload = `${input.id}.${input.timestamp}.${input.body}`;
  const expected = crypto.createHmac("sha256", keyBytes).update(signedPayload).digest("base64");

  // svix-signature header may contain multiple versions: "v1,sig1 v1,sig2"
  const candidates = input.signature.split(" ");
  for (const candidate of candidates) {
    const [, sig] = candidate.split(",");
    if (!sig) continue;
    if (constantTimeEqual(sig, expected)) return true;
  }
  return false;
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
