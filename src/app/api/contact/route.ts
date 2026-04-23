import { type NextRequest, NextResponse } from "next/server";
import { sendContactFormSubmission } from "@/lib/email/resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_FIELD_LENGTH = 200;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { firstName, lastName, email, subject, message } = (body ?? {}) as {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
  };

  const fields = { firstName, lastName, email, subject, message };
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: `${key} is required` },
        { status: 400 }
      );
    }
  }

  const f = {
    firstName: (firstName as string).trim(),
    lastName: (lastName as string).trim(),
    email: (email as string).trim().toLowerCase(),
    subject: (subject as string).trim(),
    message: (message as string).trim(),
  };

  if (!EMAIL_REGEX.test(f.email)) {
    return NextResponse.json({ ok: false, error: "Invalid email address" }, { status: 400 });
  }

  if (
    f.firstName.length > MAX_FIELD_LENGTH ||
    f.lastName.length > MAX_FIELD_LENGTH ||
    f.subject.length > MAX_FIELD_LENGTH
  ) {
    return NextResponse.json({ ok: false, error: "Field too long" }, { status: 400 });
  }

  if (f.message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "Message too long" }, { status: 400 });
  }

  try {
    const result = await sendContactFormSubmission(f);
    if (result.error) {
      console.error("[contact] Resend returned error:", result.error);
      return NextResponse.json(
        { ok: false, error: "Failed to send message" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[contact] Send failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to send message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
