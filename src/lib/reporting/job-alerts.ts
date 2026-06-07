// Job Alerts reporting aggregates. Shared by /admin/analytics (the aggregate
// dashboard) and /api/admin/job-alerts/export (per-client CSV rows). Uses the
// service client (admin-only callers).

import { createServiceClient } from "@/lib/supabase/service";

// Status sets (legacy 'offer' counts as 'offer_received').
const APPLIED = new Set(["applied", "interviewing", "final_interview", "offer_received", "offer", "accepted", "declined", "rejected", "withdrawn"]);
const INTERVIEWED = new Set(["interviewing", "final_interview", "offer_received", "offer", "accepted"]);
const OFFERED = new Set(["offer_received", "offer", "accepted", "declined"]);

export interface ClientStat {
  clientId: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  reviewStatus: string;
  totalMatches: number;
  applications: number;
  interviews: number;
  offers: number;
  accepted: number;
  topRoles: string[];
}

export interface JobAlertsReport {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  applications: number;
  interviews: number;
  offers: number;
  accepted: number;
  placementRate: number; // accepted / applications, 0..1
  topIndustries: { name: string; count: number }[];
  topRoles: { name: string; applications: number }[];
  clients: ClientStat[];
}

type WatchlistRow = {
  client_id: string | null;
  subscription_status: string;
  review_status: string;
  target_roles: string[] | null;
  industries: string[] | null;
};

export async function computeJobAlertsReport(): Promise<JobAlertsReport> {
  const supabase = createServiceClient();

  const [{ data: wlRaw }, { data: matchesRaw }] = await Promise.all([
    supabase
      .from("watchlist_profiles")
      .select("client_id, subscription_status, review_status, target_roles, industries"),
    supabase.from("client_job_matches").select("client_id, status"),
  ]);

  const watchlists = (wlRaw ?? []) as WatchlistRow[];
  const matches = (matchesRaw ?? []) as { client_id: string | null; status: string }[];

  const clientIds = watchlists.map((w) => w.client_id).filter(Boolean) as string[];
  let profileMap: Record<string, { full_name: string | null; email: string }> = {};
  if (clientIds.length > 0) {
    const { data: profilesRaw } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientIds);
    profileMap = Object.fromEntries(
      ((profilesRaw ?? []) as { id: string; full_name: string | null; email: string }[]).map((p) => [p.id, p])
    );
  }

  // Per-client match tallies.
  const tally = new Map<string, { total: number; applications: number; interviews: number; offers: number; accepted: number }>();
  for (const m of matches) {
    if (!m.client_id) continue;
    const t = tally.get(m.client_id) ?? { total: 0, applications: 0, interviews: 0, offers: 0, accepted: 0 };
    t.total++;
    if (APPLIED.has(m.status)) t.applications++;
    if (INTERVIEWED.has(m.status)) t.interviews++;
    if (OFFERED.has(m.status)) t.offers++;
    if (m.status === "accepted") t.accepted++;
    tally.set(m.client_id, t);
  }

  const clients: ClientStat[] = watchlists
    .filter((w) => w.client_id)
    .map((w) => {
      const t = tally.get(w.client_id!) ?? { total: 0, applications: 0, interviews: 0, offers: 0, accepted: 0 };
      const profile = profileMap[w.client_id!];
      return {
        clientId: w.client_id!,
        name: profile?.full_name ?? "",
        email: profile?.email ?? "",
        subscriptionStatus: w.subscription_status,
        reviewStatus: w.review_status,
        totalMatches: t.total,
        applications: t.applications,
        interviews: t.interviews,
        offers: t.offers,
        accepted: t.accepted,
        topRoles: w.target_roles ?? [],
      };
    });

  const applications = clients.reduce((s, c) => s + c.applications, 0);
  const interviews = clients.reduce((s, c) => s + c.interviews, 0);
  const offers = clients.reduce((s, c) => s + c.offers, 0);
  const accepted = clients.reduce((s, c) => s + c.accepted, 0);

  // Top industries — by client-preference frequency.
  const industryCount = new Map<string, number>();
  for (const w of watchlists) {
    for (const ind of w.industries ?? []) {
      const key = ind.trim();
      if (key) industryCount.set(key, (industryCount.get(key) ?? 0) + 1);
    }
  }
  const topIndustries = [...industryCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  // Most successful searches — target roles ranked by applications from clients targeting them.
  const roleApps = new Map<string, number>();
  for (const c of clients) {
    for (const role of c.topRoles) {
      const key = role.trim();
      if (key) roleApps.set(key, (roleApps.get(key) ?? 0) + c.applications);
    }
  }
  const topRoles = [...roleApps.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, applications]) => ({ name, applications }));

  return {
    totalClients: watchlists.length,
    activeClients: watchlists.filter((w) => w.subscription_status === "active").length,
    inactiveClients: watchlists.filter((w) => w.subscription_status !== "active").length,
    applications,
    interviews,
    offers,
    accepted,
    placementRate: applications > 0 ? accepted / applications : 0,
    topIndustries,
    topRoles,
    clients,
  };
}
