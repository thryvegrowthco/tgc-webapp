import { type NextRequest, NextResponse } from "next/server";
import {
  sendConsultationRequest,
  sendConsultationRequestAutoReply,
} from "@/lib/email/resend";
import { syncContactToGHL } from "@/lib/gohighlevel/client";
import { isNotificationDisabled } from "@/lib/notifications/settings";
import {
  CONSULTATION_SOURCE,
  consultationSource,
  leadSourceLabel,
} from "@/lib/leads/source";
import { createServiceClient } from "@/lib/supabase/service";
import { isHoneypotTripped } from "@/lib/security/honeypot";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_FIELD_LENGTH = 200;
const ALLOWED_TIMING = new Set([
  "ASAP",
  "This week",
  "Next week",
  "Within the next month",
  "Flexible",
]);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Bots that auto-fill the hidden honeypot get a silent 200 — no lead, no email.
  if (isHoneypotTripped(body)) {
    console.warn("[consultation] honeypot tripped");
    return NextResponse.json({ ok: true });
  }

  // Per-IP rate limit before any work.
  const { limited } = await checkRateLimit({
    bucket: "consultation",
    key: getClientIp(request),
    limit: 5,
    windowSeconds: 600,
  });
  if (limited) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const { firstName, lastName, email, phone, timing, message, from } = (body ?? {}) as {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    phone?: unknown;
    timing?: unknown;
    message?: unknown;
    from?: unknown;
  };

  const required = { firstName, lastName, email, message };
  for (const [key, value] of Object.entries(required)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: `${key} is required` },
        { status: 400 }
      );
    }
  }

  const data = {
    firstName: (firstName as string).trim(),
    lastName: (lastName as string).trim(),
    email: (email as string).trim().toLowerCase(),
    phone: typeof phone === "string" ? phone.trim() : "",
    timing: typeof timing === "string" ? timing.trim() : "",
    message: (message as string).trim(),
  };

  if (!EMAIL_REGEX.test(data.email)) {
    return NextResponse.json({ ok: false, error: "Invalid email address" }, { status: 400 });
  }

  if (
    data.firstName.length > MAX_FIELD_LENGTH ||
    data.lastName.length > MAX_FIELD_LENGTH ||
    data.phone.length > MAX_FIELD_LENGTH ||
    data.timing.length > MAX_FIELD_LENGTH
  ) {
    return NextResponse.json({ ok: false, error: "Field too long" }, { status: 400 });
  }

  if (data.message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "Message too long" }, { status: 400 });
  }

  if (data.timing && !ALLOWED_TIMING.has(data.timing)) {
    return NextResponse.json({ ok: false, error: "Invalid timing" }, { status: 400 });
  }

  // Attribution, not input. An unknown or hostile `from` quietly becomes an ordinary
  // consultation request, deliberately not the 400 that `timing` gets above: a stale
  // printed link must never cost Rachel a lead.
  const source = consultationSource(from);
  const sourceLabel = source === CONSULTATION_SOURCE ? undefined : leadSourceLabel(source);

  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone || undefined,
    timing: data.timing || undefined,
    message: data.message,
    sourceLabel,
  };

  // Capture the request as a lead FIRST so a Resend outage never loses it. Rachel
  // tracks + converts it to a proposal (best-effort; insert() resolves with
  // { error } instead of throwing, so without this a failed capture is invisible,
  // which is the one thing attribution must not be).
  let leadStored = false;
  try {
    const { error: leadError } = await createServiceClient().from("leads").insert({
      full_name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      phone: data.phone || null,
      timeline: data.timing || null,
      notes: data.message,
      source,
      status: "new",
    });
    if (leadError) console.error("[consultation] lead capture failed:", leadError);
    else leadStored = true;
  } catch (err) {
    console.error("[consultation] lead capture failed:", err);
  }

  // Admin alert — skippable via /admin/settings. The lead is already stored, so
  // an email failure no longer loses the request; only fail hard when the lead
  // was not stored either.
  if (!(await isNotificationDisabled("admin_email:consultation_request"))) {
    try {
      const adminResult = await sendConsultationRequest(payload);
      if (adminResult.error) {
        console.error("[consultation] Resend returned error:", adminResult.error);
        if (!leadStored) {
          return NextResponse.json(
            { ok: false, error: "Failed to send request" },
            { status: 500 }
          );
        }
      }
    } catch (err) {
      console.error("[consultation] Admin email send failed:", err);
      if (!leadStored) {
        return NextResponse.json(
          { ok: false, error: "Failed to send request" },
          { status: 500 }
        );
      }
    }
  }

  // Auto-reply and CRM sync are best-effort — don't fail the request if they error.
  // Guard the auto-reply by email so it can't be used to spam a stranger's inbox
  // (max 2 per 24h per address); the lead + admin alert above still happen.
  if (!(await isNotificationDisabled("client_email:consultation_autoreply"))) {
    const autoReplyGuard = await checkRateLimit({
      bucket: "consultation_autoreply",
      key: data.email,
      limit: 2,
      windowSeconds: 86400,
    });
    if (autoReplyGuard.limited) {
      console.warn("[consultation] auto-reply rate limited; skipping");
    } else {
      try {
        await sendConsultationRequestAutoReply(payload);
      } catch (err) {
        console.error("[consultation] Auto-reply failed:", err);
      }
    }
  }

  try {
    await syncContactToGHL({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || undefined,
      tags: ["thryve-lead", "consultation-requested"],
      customField: data.timing ? { consultation_timing: data.timing } : undefined,
    });
  } catch (err) {
    console.error("[consultation] GHL sync failed:", err);
  }

  return NextResponse.json({ ok: true });
}
