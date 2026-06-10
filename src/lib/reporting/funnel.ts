// Lead → consult → client funnel. Counts DISTINCT leads at each stage (a lead can
// have multiple proposals → use Sets). Range-filtered by leads.created_at; the
// cohort of leads created in the window is tracked through their proposals/
// conversion, which may happen later. Counts ALL leads (source is free-text).
// Stages are NOT strictly monotonic — "became client" is status-based and
// independent of a paid proposal.

import { createServiceClient } from "@/lib/supabase/service";
import type { ReportRange } from "./range";

export interface FunnelStage {
  label: string;
  count: number;
}

export interface FunnelReport {
  leadsCreated: number;
  engaged: number;
  proposalSent: number;
  proposalAccepted: number;
  proposalPaid: number;
  convertedClients: number;
  stages: FunnelStage[];
}

export async function computeFunnelReport(range: ReportRange): Promise<FunnelReport> {
  const supabase = createServiceClient();

  let leadQ = supabase.from("leads").select("id, status, converted_profile_id, created_at");
  if (range.startIso) leadQ = leadQ.gte("created_at", range.startIso);
  if (range.endIso) leadQ = leadQ.lte("created_at", range.endIso);

  const [{ data: leadsRaw }, { data: propsRaw }] = await Promise.all([
    leadQ,
    supabase.from("proposals").select("lead_id, status"),
  ]);

  const leads = (leadsRaw ?? []) as {
    id: string;
    status: string;
    converted_profile_id: string | null;
  }[];
  const proposals = (propsRaw ?? []) as { lead_id: string | null; status: string }[];

  const leadIds = new Set(leads.map((l) => l.id));
  const sentLeads = new Set<string>();
  const acceptedLeads = new Set<string>();
  const paidLeads = new Set<string>();
  for (const p of proposals) {
    if (!p.lead_id || !leadIds.has(p.lead_id)) continue;
    if (p.status === "sent" || p.status === "accepted" || p.status === "paid") sentLeads.add(p.lead_id);
    if (p.status === "accepted" || p.status === "paid") acceptedLeads.add(p.lead_id);
    if (p.status === "paid") paidLeads.add(p.lead_id);
  }

  const leadsCreated = leads.length;
  const engaged = leads.filter((l) => l.status !== "new").length;
  const convertedClients = leads.filter((l) => l.converted_profile_id != null).length;

  const stages: FunnelStage[] = [
    { label: "Leads", count: leadsCreated },
    { label: "Engaged", count: engaged },
    { label: "Proposal sent", count: sentLeads.size },
    { label: "Proposal accepted", count: acceptedLeads.size },
    { label: "Proposal paid", count: paidLeads.size },
    { label: "Became client", count: convertedClients },
  ];

  return {
    leadsCreated,
    engaged,
    proposalSent: sentLeads.size,
    proposalAccepted: acceptedLeads.size,
    proposalPaid: paidLeads.size,
    convertedClients,
    stages,
  };
}
