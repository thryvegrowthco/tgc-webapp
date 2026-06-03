// Lightweight feedback capture from the unsubscribe page. Emails Rachel
// directly — no separate table. Throttled to one per subscriber per visit.

import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resend, FROM_EMAIL } from "@/lib/email/resend";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { subscriberId, feedback } = (body ?? {}) as { subscriberId?: unknown; feedback?: unknown };
  if (typeof subscriberId !== "string" || typeof feedback !== "string" || !feedback.trim()) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: rawRow } = await supabase
    .from("newsletter_subscribers")
    .select("email, first_name")
    .eq("id", subscriberId)
    .maybeSingle();
  const sub = rawRow as { email: string; first_name: string | null } | null;
  if (!sub) return NextResponse.json({ ok: false }, { status: 404 });

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: "hello@thryvegrowth.co",
      replyTo: sub.email,
      subject: `Unsubscribe feedback from ${sub.email}`,
      text: `${sub.first_name ?? sub.email} just unsubscribed and shared:\n\n${feedback.slice(0, 2000)}\n\n— Reply to this email to follow up.`,
    });
  } catch (err) {
    console.error("[newsletter] feedback email failed:", err);
  }

  return NextResponse.json({ ok: true });
}
