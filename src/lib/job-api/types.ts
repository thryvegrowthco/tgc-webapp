// Pluggable job-source adapter contract. Each external job board implements
// JobSource.search(), returning rows already normalized to the job_listings
// shape so the ingest pipeline (src/lib/job-api/ingest.ts) can treat every
// source identically.

export interface NormalizedJob {
  title: string;
  company: string;
  location: string | null;
  is_remote: boolean;
  url: string | null;
  description: string | null;
  salary_range: string | null;
  source: string; // matches job_sources.provider + job_listings.source
  external_id: string; // stable per-source id, used for dedup
  date_posted: string | null; // yyyy-mm-dd
  closes_at: string | null; // application deadline (ISO), when the source provides one
  is_active: boolean;
}

export interface JobSourceSearchParams {
  /** OR-joined role keywords, ready to pass to a keyword search. */
  query: string;
  /** Raw target roles, for adapters that prefer structured input. */
  roles: string[];
  /** City/state string, omitted when the client is remote-only. */
  location?: string;
  isRemote?: boolean;
  /** Pagination hint; adapters may ignore. */
  numPages?: number;
}

export interface JobSource {
  /** Stable key — must equal the job_sources.provider value and the source tag written to job_listings. */
  key: string;
  label: string;
  /** Returns up to ~25 normalized jobs. Must never throw — return [] on error. */
  search(params: JobSourceSearchParams): Promise<NormalizedJob[]>;
}
