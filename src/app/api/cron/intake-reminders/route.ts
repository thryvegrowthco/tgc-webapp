// Intake reminder cron — sends T-48h and T-24h reminders to clients whose
// intake form is still incomplete before their scheduled session.
//
// Schedule: daily at 14:00 UTC = 9am CDT / 8am CST (cron-job.org fires at
// fixed UTC times so the local hour shifts by 1 across DST). Idempotent via
// automation_log UNIQUE(event_key, booking_id) — a second invocation on the
// same day is a no-op.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTemplated } from "@/lib/email/render";
import { isAuthorized, getNowFromRequest } from "@/lib/cron/auth";
import { formatCentralTime } from "@/lib/time/central";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = getNowFromRequest(request);
  const supabase = createServiceClient();

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, client_id, service_type, session_at, intake_due_at, workflow_status")
    .eq("workflow_status", "intake_needed")
    .not("session_at", "is", null);

  type Row = {
    id: string;
    client_id: string | null;
    service_type: string;
    session_at: string | null;
    intake_due_at: string | null;
    workflow_status: string;
  };
  const bookings = (bookingsRaw ?? []) as Row[];

  // Hydrate client emails
  const clientIds = [...new Set(bookings.map((b) => b.client_id).filter(Boolean))] as string[];
  let profiles: { id: string; full_name: string | null; email: string }[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientIds);
    profiles = data ?? [];
  }
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  let sent48 = 0;
  let sent24 = 0;
  let skipped = 0;

  for (const booking of bookings) {
    if (!booking.client_id || !booking.session_at) continue;
    const profile = profileMap.get(booking.client_id);
    if (!profile) continue;

    const sessionAt = new Date(booking.session_at);
    const hoursUntil = (sessionAt.getTime() - now.getTime()) / HOUR_MS;

    // T-48h window: between 47h and 49h before session
    if (hoursUntil <= 49 && hoursUntil >= 47) {
      const result = await sendTemplated("intake_reminder_48h", {
        to: profile.email,
        bookingId: booking.id,
        clientId: booking.client_id,
        idempotent: true,
        data: {
          client_name: profile.full_name?.split(" ")[0] || "there",
          service_type: booking.service_type,
          session_workspace_url: `${APP_URL}/dashboard/sessions/${booking.id}`,
        },
      });
      if (result.sent) sent48++; else skipped++;
      continue;
    }

    // T-24h window: between 23h and 25h before session
    if (hoursUntil <= 25 && hoursUntil >= 23) {
      const result = await sendTemplated("intake_reminder_24h", {
        to: profile.email,
        bookingId: booking.id,
        clientId: booking.client_id,
        idempotent: true,
        data: {
          client_name: profile.full_name?.split(" ")[0] || "there",
          service_type: booking.service_type,
          session_time: formatCentralTime(sessionAt),
          session_workspace_url: `${APP_URL}/dashboard/sessions/${booking.id}`,
        },
      });
      if (result.sent) sent24++; else skipped++;
    }
  }

  return Response.json({
    ok: true,
    now: now.toISOString(),
    scanned: bookings.length,
    sent_48h: sent48,
    sent_24h: sent24,
    skipped,
  });
}
