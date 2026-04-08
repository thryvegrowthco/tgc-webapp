// JSearch API wrapper via RapidAPI
// Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

export interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city: string | null;
  job_state: string | null;
  job_country: string | null;
  job_is_remote: boolean;
  job_apply_link: string | null;
  job_description: string | null;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string | null;
  job_posted_at_datetime_utc: string | null;
}

export interface JSearchResponse {
  data: JSearchJob[];
  status: string;
}

export interface JobSearchParams {
  query: string;
  location?: string;
  isRemote?: boolean;
  numPages?: number;
}

function buildLocation(job: JSearchJob): string | null {
  const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function buildSalaryRange(job: JSearchJob): string | null {
  const { job_min_salary, job_max_salary, job_salary_currency } = job;
  if (!job_min_salary && !job_max_salary) return null;
  const currency = job_salary_currency === "USD" ? "$" : (job_salary_currency ?? "");
  if (job_min_salary && job_max_salary) {
    return `${currency}${Math.round(job_min_salary / 1000)}k–${currency}${Math.round(job_max_salary / 1000)}k`;
  }
  if (job_min_salary) return `${currency}${Math.round(job_min_salary / 1000)}k+`;
  if (job_max_salary) return `Up to ${currency}${Math.round(job_max_salary / 1000)}k`;
  return null;
}

export async function searchJobs(params: JobSearchParams): Promise<JSearchJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.warn("[JSearch] RAPIDAPI_KEY not set — skipping job fetch");
    return [];
  }

  const searchQuery = params.location
    ? `${params.query} in ${params.location}`
    : params.query;

  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", searchQuery);
  url.searchParams.set("num_pages", String(params.numPages ?? 1));
  if (params.isRemote) url.searchParams.set("work_from_home", "true");

  const response = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
    next: { revalidate: 3600 }, // cache 1h
  });

  if (!response.ok) {
    console.error("[JSearch] API error:", response.status, await response.text());
    return [];
  }

  const result = (await response.json()) as JSearchResponse;
  return result.data ?? [];
}

// Convert a raw JSearch job into the shape we insert into job_listings
export function normalizeJob(job: JSearchJob) {
  return {
    title: job.job_title,
    company: job.employer_name,
    location: buildLocation(job),
    is_remote: job.job_is_remote ?? false,
    url: job.job_apply_link ?? null,
    description: job.job_description
      ? job.job_description.slice(0, 2000) // truncate for storage
      : null,
    salary_range: buildSalaryRange(job),
    source: "jsearch" as const,
    external_id: job.job_id,
    date_posted: job.job_posted_at_datetime_utc
      ? job.job_posted_at_datetime_utc.slice(0, 10)
      : null,
    is_active: true,
  };
}
