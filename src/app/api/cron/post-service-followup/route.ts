// Post-service follow-up cron — runs daily.
// Sends the post-service email to clients 24 hours after their booking was
// marked completed. Idempotent via bookings.follow_up_sent_at + automation_log.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTemplated } from "@/lib/email/render";
import { isAuthorized, getNowFromRequest } from "@/lib/cron/auth";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = getNowFromRequest(request);
  const cutoff = new Date(now.getTime() - 24 * HOUR_MS).toISOString();
  const supabase = createServiceClient();

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, client_id, service_type, completed_at, follow_up_sent_at")
    .eq("workflow_status", "completed")
    .is("follow_up_sent_at", null)
    .lt("completed_at", cutoff);

  type Row = {
    id: string;
    client_id: string | null;
    service_type: string;
    completed_at: string | null;
    follow_up_sent_at: string | null;
  };
  const bookings = (bookingsRaw ?? []) as Row[];

  if (bookings.length === 0) {
    return Response.json({ ok: true, sent: 0 });
  }

  const clientIds = [...new Set(bookings.map((b) => b.client_id).filter(Boolean))] as string[];
  let profiles: { id: string; full_name: string | null; email: string }[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", clientIds);
    profiles = data ?? [];
  }
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  let sent = 0;
  for (const booking of bookings) {
    if (!booking.client_id) continue;
    const profile = profileMap.get(booking.client_id);
    if (!profile) continue;

    const result = await sendTemplated("post_service_followup", {
      to: profile.email,
      bookingId: booking.id,
      clientId: booking.client_id,
      idempotent: true,
      data: {
        client_name: profile.full_name?.split(" ")[0] || "there",
        service_type: booking.service_type,
        session_workspace_url: `${APP_URL}/dashboard/sessions/${booking.id}`,
        testimonial_url: `${APP_URL}/testimonial`,
        book_url: `${APP_URL}/book`,
      },
    });

    if (result.sent) {
      await supabase
        .from("bookings")
        .update({
          follow_up_sent_at: now.toISOString(),
          workflow_status: "follow_up_sent",
        })
        .eq("id", booking.id);
      sent++;
    }
  }

  return Response.json({ ok: true, scanned: bookings.length, sent });
}
