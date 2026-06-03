// Daily availability extender — keeps a rolling 8-week window of slots
// materialized from active recurring patterns. Triggered by cron-job.org;
// see docs/integrations.md for the schedule and Bearer header setup.
//
// Idempotent: materializePatterns upserts on UNIQUE(slot_date, start_time)
// and pre-filters against existing slot keys, so re-running is safe.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { materializePatterns } from "@/lib/availability/generate";
import { isAuthorized, getNowFromRequest } from "@/lib/cron/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = getNowFromRequest(request);
  const result = await materializePatterns({ now });

  const supabase = createServiceClient();
  await supabase.from("automation_log").insert({
    event_key: "availability_extended",
    status: "success",
    payload: {
      created: result.created,
      scanned: result.scanned,
      window_start: result.windowStart,
      window_end: result.windowEnd,
    },
  });

  return Response.json({
    ok: true,
    now: now.toISOString(),
    created: result.created,
    scanned: result.scanned,
    window_start: result.windowStart,
    window_end: result.windowEnd,
  });
}
