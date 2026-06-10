// No-show rate = no_show / (no_show + completed) over bookings.workflow_status,
// overall + by service. Time-bound by COALESCE(session_at, created_at) (don't
// drop bookings with a null session_at). Other workflow_statuses (cancelled,
// confirmed, …) count toward NEITHER numerator nor denominator.

import { createServiceClient } from "@/lib/supabase/service";
import type { ReportRange } from "./range";

export interface NoShowServiceRow {
  service: string;
  noShow: number;
  completed: number;
  rate: number; // 0..1
}

export interface NoShowReport {
  noShow: number;
  completed: number;
  rate: number; // 0..1
  rows: NoShowServiceRow[];
}

export async function computeNoShowReport(range: ReportRange): Promise<NoShowReport> {
  const supabase = createServiceClient();
  // Select broad + filter workflow_status in TS (it's a union literal — a typed
  // .eq()/.in() narrows the result to never; see CLAUDE.md).
  const { data } = await supabase
    .from("bookings")
    .select("workflow_status, service_type, session_at, created_at");

  let rows = (data ?? []) as {
    workflow_status: string;
    service_type: string;
    session_at: string | null;
    created_at: string;
  }[];

  const startMs = range.startIso ? new Date(range.startIso).getTime() : null;
  if (startMs !== null) {
    rows = rows.filter((b) => new Date(b.session_at ?? b.created_at).getTime() >= startMs);
  }

  const relevant = rows.filter(
    (b) => b.workflow_status === "no_show" || b.workflow_status === "completed"
  );
  const noShow = relevant.filter((b) => b.workflow_status === "no_show").length;
  const completed = relevant.length - noShow;
  const denom = noShow + completed;

  const byService = new Map<string, { noShow: number; completed: number }>();
  for (const b of relevant) {
    const key = b.service_type?.trim() || "Unknown";
    const cur = byService.get(key) ?? { noShow: 0, completed: 0 };
    if (b.workflow_status === "no_show") cur.noShow++;
    else cur.completed++;
    byService.set(key, cur);
  }

  const serviceRows: NoShowServiceRow[] = [...byService.entries()]
    .map(([service, v]) => {
      const d = v.noShow + v.completed;
      return { service, noShow: v.noShow, completed: v.completed, rate: d > 0 ? v.noShow / d : 0 };
    })
    .sort((a, b) => b.noShow + b.completed - (a.noShow + a.completed));

  return {
    noShow,
    completed,
    rate: denom > 0 ? noShow / denom : 0,
    rows: serviceRows,
  };
}
