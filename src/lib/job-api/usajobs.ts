// USAJOBS.gov Search API adapter (official federal job board, free).
// Docs: https://developer.usajobs.gov/api-reference/get-api-search
//
// Requires two env vars (both issued when you register at developer.usajobs.gov):
//   USAJOBS_API_KEY     — the Authorization-Key header value
//   USAJOBS_USER_AGENT  — the email you registered with (sent as User-Agent)
// Without them the adapter logs a warning and returns [] (graceful degrade).

import type { JobSource, JobSourceSearchParams, NormalizedJob } from "./types";

interface UsaJobsRemuneration {
  MinimumRange?: string;
  MaximumRange?: string;
  RateIntervalCode?: string;
}

interface UsaJobsDescriptor {
  PositionID?: string;
  PositionTitle?: string;
  PositionURI?: string;
  ApplyURI?: string[];
  PositionLocationDisplay?: string;
  OrganizationName?: string;
  DepartmentName?: string;
  PositionRemuneration?: UsaJobsRemuneration[];
  PublicationStartDate?: string;
  ApplicationCloseDate?: string;
  UserArea?: { Details?: { JobSummary?: string; TeleworkEligible?: string | boolean } };
}

interface UsaJobsItem {
  MatchedObjectId?: string;
  MatchedObjectDescriptor?: UsaJobsDescriptor;
}

interface UsaJobsResponse {
  SearchResult?: { SearchResultItems?: UsaJobsItem[] };
}

function buildSalary(rem?: UsaJobsRemuneration[]): string | null {
  const r = rem?.[0];
  if (!r) return null;
  const min = r.MinimumRange ? Number(r.MinimumRange) : 0;
  const max = r.MaximumRange ? Number(r.MaximumRange) : 0;
  const perYear = (r.RateIntervalCode ?? "").toLowerCase().includes("year");
  if (!perYear || (!min && !max)) return null;
  const k = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${k(min)}–${k(max)}`;
  if (min) return `${k(min)}+`;
  return max ? `Up to ${k(max)}` : null;
}

export const usajobsSource: JobSource = {
  key: "usajobs",
  label: "USAJOBS.gov (federal government)",
  async search(params: JobSourceSearchParams): Promise<NormalizedJob[]> {
    const apiKey = process.env.USAJOBS_API_KEY;
    const userAgent = process.env.USAJOBS_USER_AGENT;
    if (!apiKey || !userAgent) {
      console.warn("[usajobs] USAJOBS_API_KEY / USAJOBS_USER_AGENT not set — skipping");
      return [];
    }

    try {
      const url = new URL("https://data.usajobs.gov/api/search");
      url.searchParams.set("Keyword", params.roles[0] ?? params.query);
      url.searchParams.set("ResultsPerPage", "25");
      if (params.location && !params.isRemote) url.searchParams.set("LocationName", params.location);

      const response = await fetch(url.toString(), {
        headers: {
          Host: "data.usajobs.gov",
          "User-Agent": userAgent,
          "Authorization-Key": apiKey,
        },
        next: { revalidate: 3600 },
      });
      if (!response.ok) {
        console.error("[usajobs] API error:", response.status);
        return [];
      }

      const result = (await response.json()) as UsaJobsResponse;
      const items = result.SearchResult?.SearchResultItems ?? [];

      return items
        .map((item): NormalizedJob | null => {
          const d = item.MatchedObjectDescriptor;
          const externalId = item.MatchedObjectId ?? d?.PositionID;
          if (!d || !externalId || !d.PositionTitle) return null;
          const locationStr = d.PositionLocationDisplay ?? null;
          const telework = d.UserArea?.Details?.TeleworkEligible;
          const isRemote =
            telework === true ||
            telework === "true" ||
            (locationStr ?? "").toLowerCase().includes("remote");
          const closeDate = d.ApplicationCloseDate ? new Date(d.ApplicationCloseDate) : null;
          return {
            title: d.PositionTitle,
            company: d.OrganizationName ?? d.DepartmentName ?? "U.S. Government",
            location: locationStr,
            is_remote: isRemote,
            url: d.ApplyURI?.[0] ?? d.PositionURI ?? null,
            description: d.UserArea?.Details?.JobSummary ? d.UserArea.Details.JobSummary.slice(0, 2000) : null,
            salary_range: buildSalary(d.PositionRemuneration),
            source: "usajobs",
            external_id: externalId,
            date_posted: d.PublicationStartDate ? d.PublicationStartDate.slice(0, 10) : null,
            closes_at: closeDate && !Number.isNaN(closeDate.getTime()) ? closeDate.toISOString() : null,
            is_active: true,
          };
        })
        .filter((j): j is NormalizedJob => j !== null);
    } catch (err) {
      console.error("[usajobs] search failed:", err);
      return [];
    }
  },
};
