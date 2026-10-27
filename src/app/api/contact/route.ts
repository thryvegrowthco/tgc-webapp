import { type NextRequest, NextResponse } from "next/server";
import { sendContactFormSubmission } from "@/lib/email/resend";
import { isNotificationDisabled } from "@/lib/notifications/settings";
import { createServiceClient } from "@/lib/supabase/service";

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

  // Persist the message FIRST so a Resend outage never silently drops it. The
  // service client bypasses RLS; inserts are service-role only (migration 0039).
  // If 0039 hasn't been applied yet the table won't exist (42P01 / PGRST205) —
  // log the code only (no body or email) and fall through to the email path.
  const supabase = createServiceClient();
  let storedId: string | null = null;
  try {
    const { data: inserted, error: insertError } = await supabase
      .from("contact_messages")
      .insert({
        first_name: f.firstName,
        last_name: f.lastName,
        email: f.email,
        subject: f.subject,
        message: f.message,
      })
      .select("id")
      .single();
    if (insertError) {
      console.error("[contact] store failed:", insertError.code || "unknown");
    } else {
      storedId = (inserted as { id: string } | null)?.id ?? null;
    }
  } catch (err) {
    console.error("[contact] store threw:", (err as { code?: string })?.code || "unknown");
  }

  // Admin alert — skippable via /admin/settings. The message is already stored,
  // so a disabled alert or a Resend failure no longer loses it.
  let emailSent = false;
  if (!(await isNotificationDisabled("admin_email:contact_form"))) {
    try {
      const result = await sendContactFormSubmission(f);
      if (result.error) {
        console.error("[contact] Resend returned error:", result.error);
      } else {
        emailSent = true;
      }
    } catch (err) {
      console.error("[contact] Send failed:", err);
    }
  }

  // Mark the stored row as emailed once both succeeded.
  if (storedId && emailSent) {
    const { error: updateError } = await supabase
      .from("contact_messages")
      .update({ email_sent: true })
      .eq("id", storedId);
    if (updateError) {
      console.error("[contact] email_sent update failed:", updateError.code || "unknown");
    }
  }

  // Never silently lose a message: succeed if it was stored OR emailed; only
  // fail hard when both failed.
  if (storedId || emailSent) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    { ok: false, error: "Failed to send message" },
    { status: 500 }
  );
}
