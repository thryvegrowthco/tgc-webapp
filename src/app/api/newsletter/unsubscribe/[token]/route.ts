// Gmail one-click unsubscribe endpoint (RFC 8058).
// Referenced in the List-Unsubscribe header. Both GET and POST mark the
// subscriber as unsubscribed; POST returns 200 immediately, GET redirects
// to the human-facing confirmation page.

import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncNewsletterSubscriber } from "@/lib/gohighlevel/client";
import { notifyAdmin } from "@/lib/notifications/admin";

export const runtime = "nodejs";

async function unsubscribeByToken(token: string): Promise<{ email: string | null; ok: boolean }> {
  if (!token) return { email: null, ok: false };

  const supabase = createServiceClient();
  const { data: rawRow } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  const sub = rawRow as { id: string; email: string; unsubscribed_at: string | null } | null;
  if (!sub) return { email: null, ok: false };

  if (!sub.unsubscribed_at) {
    const now = new Date().toISOString();
    await supabase
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: now })
      .eq("id", sub.id);

    await supabase.from("newsletter_events").insert({
      subscriber_id: sub.id,
      event_type: "unsubscribed",
      occurred_at: now,
    });

    syncNewsletterSubscriber({ email: sub.email }).catch((err) =>
      console.error("[newsletter] GHL unsubscribe sync failed:", err)
    );

    notifyAdmin({
      type: "subscriber_unsubscribed",
      subject: `Newsletter unsubscribe: ${sub.email}`,
      title: "Newsletter unsubscribe",
      fields: [{ label: "Email", value: sub.email }],
      link: "/admin/newsletter/subscribers",
      ctaLabel: "View subscribers",
      replyTo: sub.email,
    }).catch((err) => console.error("[newsletter] admin notify failed:", err));
  }

  return { email: sub.email, ok: true };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await unsubscribeByToken(token);
  if (!result.ok) return new Response("Not found", { status: 404 });
  return new Response(null, { status: 200 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await unsubscribeByToken(token);
  // Redirect to the pretty confirmation page regardless of result so visitors
  // don't see an opaque API error.
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(`${origin}/newsletter/unsubscribe/${encodeURIComponent(token)}`, 303);
}
