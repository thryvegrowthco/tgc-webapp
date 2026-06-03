import { type NextRequest, NextResponse } from "next/server";
import {
  sendConsultationRequest,
  sendConsultationRequestAutoReply,
} from "@/lib/email/resend";
import { syncContactToGHL } from "@/lib/gohighlevel/client";

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

  const { firstName, lastName, email, phone, timing, message } = (body ?? {}) as {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    phone?: unknown;
    timing?: unknown;
    message?: unknown;
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

  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone || undefined,
    timing: data.timing || undefined,
    message: data.message,
  };

  try {
    const adminResult = await sendConsultationRequest(payload);
    if (adminResult.error) {
      console.error("[consultation] Resend returned error:", adminResult.error);
      return NextResponse.json(
        { ok: false, error: "Failed to send request" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[consultation] Admin email send failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to send request" },
      { status: 500 }
    );
  }

  // Auto-reply and CRM sync are best-effort — don't fail the request if they error.
  try {
    await sendConsultationRequestAutoReply(payload);
  } catch (err) {
    console.error("[consultation] Auto-reply failed:", err);
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
