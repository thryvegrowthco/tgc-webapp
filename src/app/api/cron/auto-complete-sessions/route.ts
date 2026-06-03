// Auto-complete cron — runs hourly.
// Transitions `session_scheduled` → `completed` for bookings whose
// session_at is at least 24h in the past (a grace window for Rachel to
// manually mark complete first).

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorized, getNowFromRequest } from "@/lib/cron/auth";

export const runtime = "nodejs";

const GRACE_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = getNowFromRequest(request);
  const cutoff = new Date(now.getTime() - GRACE_HOURS * HOUR_MS).toISOString();
  const supabase = createServiceClient();

  // Pull `session_scheduled` bookings where session_at + grace has passed.
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, client_id, session_at, workflow_status")
    .eq("workflow_status", "session_scheduled")
    .lt("session_at", cutoff);

  // Also pick up bookings that paid but never got past intake_complete —
  // their session_at has passed too, treat them as completed so the
  // follow-up cron picks them up.
  const { data: laggingRaw } = await supabase
    .from("bookings")
    .select("id, client_id, session_at, workflow_status")
    .in("workflow_status", ["intake_complete", "intake_needed"])
    .lt("session_at", cutoff);

  const toComplete = [...(bookingsRaw ?? []), ...(laggingRaw ?? [])];
  if (toComplete.length === 0) {
    return Response.json({ ok: true, completed: 0 });
  }

  const ids = toComplete.map((b) => b.id);
  const { error } = await supabase
    .from("bookings")
    .update({
      workflow_status: "completed",
      status: "completed",
      completed_at: now.toISOString(),
    })
    .in("id", ids);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Log one row per booking for auditability
  for (const b of toComplete) {
    await supabase.from("automation_log").upsert(
      {
        event_key: "auto_completed",
        booking_id: b.id,
        client_id: b.client_id,
        status: "success",
        payload: { previous_workflow_status: b.workflow_status, session_at: b.session_at },
      },
      { onConflict: "event_key,booking_id" }
    );
  }

  return Response.json({ ok: true, completed: ids.length, booking_ids: ids });
}
