// Registry of available job-source adapters + helper to resolve which are
// enabled (intersection of the job_sources table and registered adapters).

import { createServiceClient } from "@/lib/supabase/service";
import { jsearchSource } from "./jsearch";
import { usajobsSource } from "./usajobs";
import type { JobSource } from "./types";

export const ALL_SOURCES: Record<string, JobSource> = {
  [jsearchSource.key]: jsearchSource,
  [usajobsSource.key]: usajobsSource,
};

export function getSource(key: string): JobSource | undefined {
  return ALL_SOURCES[key];
}

/** Adapters that are both registered and toggled on in job_sources. */
export async function getEnabledSources(): Promise<JobSource[]> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("job_sources")
      .select("provider")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    const rows = (data ?? []) as { provider: string }[];
    const enabled = rows.map((r) => ALL_SOURCES[r.provider]).filter(Boolean) as JobSource[];
    // If the table is empty/unreadable, default to JSearch so the feed still runs.
    return enabled.length > 0 ? enabled : [jsearchSource];
  } catch {
    return [jsearchSource];
  }
}
