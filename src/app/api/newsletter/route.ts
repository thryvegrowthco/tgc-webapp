import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncNewsletterSubscriber } from "@/lib/gohighlevel/client";
import { sanitizeInterests } from "@/lib/newsletter/interests";
import { sendWelcomeEmail } from "@/lib/email/newsletter-welcome";
import { notifyAdmin } from "@/lib/notifications/admin";
import { isNotificationDisabled } from "@/lib/notifications/settings";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SubscriberRow = {
  id: string;
  email: string;
  first_name: string | null;
  interests: string[];
  unsubscribe_token: string;
  unsubscribed_at: string | null;
  welcome_sent_at: string | null;
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { email, firstName, source, interests } = (body ?? {}) as {
    email?: unknown;
    firstName?: unknown;
    source?: unknown;
    interests?: unknown;
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
    typeof source === "string" && source.trim().length > 0 ? source.trim() : "footer";
  const validInterests = sanitizeInterests(interests);

  const supabase = createServiceClient();

  // Upsert: if the email already exists, merge interests (don't overwrite) and
  // clear any previous unsubscribe so re-subscribers resume cleanly.
  const { data: existingRaw } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, first_name, interests, unsubscribe_token, unsubscribed_at, welcome_sent_at")
    .eq("email", normalizedEmail)
    .maybeSingle();
  const existing = existingRaw as unknown as SubscriberRow | null;

  let subscriber: SubscriberRow;

  if (existing) {
    const mergedInterests = Array.from(new Set([...(existing.interests ?? []), ...validInterests]));
    const { data: updatedRaw, error: updateError } = await supabase
      .from("newsletter_subscribers")
      .update({
        first_name: existing.first_name ?? normalizedFirstName,
        interests: mergedInterests,
        unsubscribed_at: null,
      })
      .eq("id", existing.id)
      .select("id, email, first_name, interests, unsubscribe_token, unsubscribed_at, welcome_sent_at")
      .single();

    if (updateError || !updatedRaw) {
      console.error("[newsletter] update failed:", updateError);
      return NextResponse.json({ ok: false, error: "Failed to subscribe" }, { status: 500 });
    }
    subscriber = updatedRaw as unknown as SubscriberRow;
  } else {
    const { data: insertedRaw, error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert({
        email: normalizedEmail,
        first_name: normalizedFirstName,
        source: normalizedSource,
        interests: validInterests,
      })
      .select("id, email, first_name, interests, unsubscribe_token, unsubscribed_at, welcome_sent_at")
      .single();

    if (insertError || !insertedRaw) {
      console.error("[newsletter] insert failed:", insertError);
      return NextResponse.json({ ok: false, error: "Failed to subscribe" }, { status: 500 });
    }
    subscriber = insertedRaw as unknown as SubscriberRow;
  }

  // GHL sync — fire-and-forget, never block the response
  syncNewsletterSubscriber({
    email: subscriber.email,
    firstName: subscriber.first_name ?? undefined,
  }).catch((err) => console.error("[newsletter] GHL sync failed:", err));

  // Welcome email — only first time. Stamp welcome_sent_at to make this idempotent.
  if (!subscriber.welcome_sent_at && !(await isNotificationDisabled("client_email:newsletter_welcome"))) {
    try {
      await sendWelcomeEmail({
        email: subscriber.email,
        firstName: subscriber.first_name,
        unsubscribeToken: subscriber.unsubscribe_token,
      });
      await supabase
        .from("newsletter_subscribers")
        .update({ welcome_sent_at: new Date().toISOString() })
        .eq("id", subscriber.id);
    } catch (err) {
      console.error("[newsletter] welcome email failed:", err);
    }
  }

  // Notify Rachel of a genuinely new subscriber or a resubscribe (skip a plain
  // re-submit by an already-active subscriber). Fire-and-forget.
  const isResubscribe = existing !== null && existing.unsubscribed_at !== null;
  if (existing === null || isResubscribe) {
    notifyAdmin({
      type: "new_subscriber",
      subject: `New newsletter subscriber: ${subscriber.email}`,
      title: isResubscribe ? "Newsletter resubscribe" : "New newsletter subscriber",
      fields: [
        { label: "Email", value: subscriber.email },
        { label: "Name", value: subscriber.first_name ?? "—" },
        { label: "Source", value: normalizedSource },
        { label: "Interests", value: (subscriber.interests ?? []).join(", ") || "—" },
      ],
      link: "/admin/newsletter/subscribers",
      ctaLabel: "View subscribers",
      replyTo: subscriber.email,
    }).catch((err) => console.error("[newsletter] admin notify failed:", err));
  }

  return NextResponse.json({
    ok: true,
    alreadySubscribed: existing !== null,
  });
}
