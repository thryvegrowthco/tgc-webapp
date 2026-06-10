// Session-package utilization = sessions_used / sessions_total, overall + by
// service. The denominator excludes 'refunded' packages (refunded credits aren't
// capacity). "Lost credits" = expired packages with unused sessions. Range by
// purchased_at. (A 1-session package becomes 'exhausted' at first use → util 1.0,
// which is correct.)

import { createServiceClient } from "@/lib/supabase/service";
import type { ReportRange } from "./range";

export interface PackageServiceRow {
  service: string;
  totalSessions: number;
  usedSessions: number;
  utilization: number; // 0..1
  packages: number;
}

export interface PackageUtilizationReport {
  totalSessions: number;
  usedSessions: number;
  utilization: number; // 0..1
  lostCreditPackages: number;
  lostCredits: number;
  rows: PackageServiceRow[];
}

export async function computePackageUtilizationReport(range: ReportRange): Promise<PackageUtilizationReport> {
  const supabase = createServiceClient();
  let q = supabase
    .from("session_packages")
    .select("service_type, sessions_total, sessions_used, status, purchased_at");
  if (range.startIso) q = q.gte("purchased_at", range.startIso);
  if (range.endIso) q = q.lte("purchased_at", range.endIso);
  const { data } = await q;

  const all = (data ?? []) as {
    service_type: string;
    sessions_total: number;
    sessions_used: number;
    status: string;
  }[];

  const counted = all.filter((p) => p.status !== "refunded");
  const totalSessions = counted.reduce((s, p) => s + (p.sessions_total ?? 0), 0);
  const usedSessions = counted.reduce((s, p) => s + (p.sessions_used ?? 0), 0);

  const lost = all.filter((p) => p.status === "expired" && p.sessions_used < p.sessions_total);
  const lostCredits = lost.reduce((s, p) => s + (p.sessions_total - p.sessions_used), 0);

  const byService = new Map<string, { total: number; used: number; packages: number }>();
  for (const p of counted) {
    const key = p.service_type?.trim() || "Unknown";
    const c = byService.get(key) ?? { total: 0, used: 0, packages: 0 };
    c.total += p.sessions_total ?? 0;
    c.used += p.sessions_used ?? 0;
    c.packages++;
    byService.set(key, c);
  }

  const rows: PackageServiceRow[] = [...byService.entries()]
    .map(([service, v]) => ({
      service,
      totalSessions: v.total,
      usedSessions: v.used,
      utilization: v.total > 0 ? v.used / v.total : 0,
      packages: v.packages,
    }))
    .sort((a, b) => b.totalSessions - a.totalSessions);

  return {
    totalSessions,
    usedSessions,
    utilization: totalSessions > 0 ? usedSessions / totalSessions : 0,
    lostCreditPackages: lost.length,
    lostCredits,
    rows,
  };
}
