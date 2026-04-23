import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncNewsletterSubscriber } from "@/lib/gohighlevel/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { email, firstName, source } = (body ?? {}) as {
    email?: unknown;
    firstName?: unknown;
    source?: unknown;
  };

  if (typeof email !== "string") {
    return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json({ ok: false, error: "Invalid email address" }, { status: 400 });
  }

  const normalizedFirstName =
    typeof firstName === "string" && firstName.trim().length > 0 ? firstName.trim() : null;
  const normalizedSource =
    typeof source === "string" && source.trim().length > 0 ? source.trim() : null;

  const supabase = createServiceClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({
    email: normalizedEmail,
    first_name: normalizedFirstName,
    source: normalizedSource,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }
    console.error("[newsletter] Supabase insert failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to subscribe" }, { status: 500 });
  }

  try {
    await syncNewsletterSubscriber({
      email: normalizedEmail,
      firstName: normalizedFirstName ?? undefined,
    });
  } catch (ghlError) {
    console.error("[newsletter] GHL sync failed:", ghlError);
  }

  return NextResponse.json({ ok: true });
}
