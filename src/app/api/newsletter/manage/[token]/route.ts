// Token-authenticated interest management endpoint. Used by the public
// /newsletter/manage/[token] page — no login required, the token is the
// authentication.

import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeInterests } from "@/lib/newsletter/interests";
import { notifyAdmin } from "@/lib/notifications/admin";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { interests, resubscribe } = (body ?? {}) as {
    interests?: unknown;
    resubscribe?: unknown;
  };
  const cleanInterests = sanitizeInterests(interests);

  const supabase = createServiceClient();
  const { data: rawRow } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  const sub = rawRow as { id: string; email: string; unsubscribed_at: string | null } | null;
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: { interests: string[]; unsubscribed_at?: string | null } = {
    interests: cleanInterests,
  };
  if (resubscribe === true) {
    update.unsubscribed_at = null;
  }

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update(update)
    .eq("id", sub.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const didResubscribe = resubscribe === true && sub.unsubscribed_at !== null;
  notifyAdmin({
    type: "subscriber_updated",
    subject: `Newsletter preferences updated: ${sub.email}`,
    title: didResubscribe ? "Newsletter resubscribe + preferences" : "Newsletter preferences updated",
    fields: [
      { label: "Email", value: sub.email },
      { label: "Interests", value: cleanInterests.join(", ") || "—" },
      ...(didResubscribe ? [{ label: "Resubscribed", value: "Yes" }] : []),
    ],
    link: "/admin/newsletter/subscribers",
    ctaLabel: "View subscribers",
    replyTo: sub.email,
  }).catch((err) => console.error("[newsletter] admin notify failed:", err));

  return NextResponse.json({ ok: true });
}
