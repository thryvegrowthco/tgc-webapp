// Pure scoring function. No side effects. Given a client's watchlist
// preferences and a job listing, returns a score 0–100 and a label.
//
// Weights:
//   role keywords (title + description) ........... 40
//   location / remote preference ................... 25
//   salary band ..................................... 15
//   experience level ................................ 15
//   industries (company + description) ............... 5
//
// Threshold for inclusion: 60.
//   80–100 → "strong"
//   65–79  → "good"
//   60–64  → "maybe"

export interface ProfileForScoring {
  target_roles: string[] | null;
  industries: string[] | null;
  locations: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  remote_preference: "remote" | "hybrid" | "onsite" | "any" | null;
  experience_level: string | null;
}

export interface JobForScoring {
  title: string;
  company: string;
  location: string | null;
  is_remote: boolean;
  description: string | null;
  salary_range: string | null;
}

export interface ScoreResult {
  score: number;
  label: "strong" | "good" | "maybe" | null;
  reasons: string[];
}

const MATCH_THRESHOLD = 60;

export function scoreJobAgainstProfile(
  profile: ProfileForScoring,
  job: JobForScoring
): ScoreResult {
  const reasons: string[] = [];

  const roleScore = scoreRoles(profile.target_roles, job, reasons);
  const locationScore = scoreLocation(profile, job, reasons);
  const salaryScore = scoreSalary(profile, job, reasons);
  const experienceScore = scoreExperience(profile.experience_level, job, reasons);
  const industryScore = scoreIndustries(profile.industries, job, reasons);

  const total = roleScore + locationScore + salaryScore + experienceScore + industryScore;
  const score = Math.max(0, Math.min(100, Math.round(total)));

  let label: ScoreResult["label"] = null;
  if (score >= 80) label = "strong";
  else if (score >= 65) label = "good";
  else if (score >= 60) label = "maybe";

  return { score, label, reasons };
}

export function shouldIncludeMatch(score: number): boolean {
  return score >= MATCH_THRESHOLD;
}

// ─── Role keywords (40 pts) ───────────────────────────────────────────────
function scoreRoles(
  targetRoles: string[] | null,
  job: JobForScoring,
  reasons: string[]
): number {
  if (!targetRoles || targetRoles.length === 0) return 0;

  const haystack = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const titleLower = job.title.toLowerCase();

  let bestRoleScore = 0;
  let bestRole = "";

  for (const role of targetRoles) {
    const tokens = tokenize(role);
    if (tokens.length === 0) continue;

    const titleMatches = tokens.filter((t) => titleLower.includes(t)).length;
    const descMatches = tokens.filter((t) => haystack.includes(t)).length;

    // Title hit is worth more than description hit
    const ratio = titleMatches / tokens.length;
    const descRatio = descMatches / tokens.length;
    const roleScore = ratio * 30 + descRatio * 10;

    if (roleScore > bestRoleScore) {
      bestRoleScore = roleScore;
      bestRole = role;
    }
  }

  if (bestRoleScore > 0) {
    reasons.push(`Title/description match for "${bestRole}"`);
  }

  return Math.min(40, bestRoleScore);
}

// ─── Location / remote (25 pts) ────────────────────────────────────────────
function scoreLocation(
  profile: ProfileForScoring,
  job: JobForScoring,
  reasons: string[]
): number {
  const pref = profile.remote_preference;

  if (pref === "remote") {
    if (job.is_remote) {
      reasons.push("Remote, matches preference");
      return 25;
    }
    return 0;
  }

  if (pref === "any" || !pref) {
    if (job.is_remote) reasons.push("Remote (open preference)");
    else reasons.push("Open to any work arrangement");
    return 25;
  }

  // hybrid or onsite — check location overlap
  const locations = profile.locations ?? [];
  if (locations.length === 0) return 15; // partial credit, no city pref

  const jobLoc = (job.location ?? "").toLowerCase();
  const matched = locations.find((l) => jobLoc.includes(l.toLowerCase()));

  if (matched) {
    reasons.push(`Location match: ${matched}`);
    return 25;
  }

  if (job.is_remote && pref === "hybrid") {
    reasons.push("Remote (hybrid preference)");
    return 15;
  }

  return 0;
}

// ─── Salary (15 pts) ───────────────────────────────────────────────────────
function scoreSalary(
  profile: ProfileForScoring,
  job: JobForScoring,
  reasons: string[]
): number {
  const profileMin = profile.salary_min ?? 0;
  const profileMax = profile.salary_max ?? 0;

  if (profileMin === 0 && profileMax === 0) return 8; // partial credit, no preference

  if (!job.salary_range) return 5; // unknown salary on job, neutral partial

  const jobBand = parseSalaryRange(job.salary_range);
  if (!jobBand) return 5;

  // overlap calculation
  const minOK = profileMin === 0 || jobBand.max >= profileMin;
  const maxOK = profileMax === 0 || jobBand.min <= profileMax;

  if (minOK && maxOK) {
    reasons.push(`Salary in range (${job.salary_range})`);
    return 15;
  }

  if (minOK || maxOK) {
    reasons.push("Partial salary overlap");
    return 8;
  }

  return 0;
}

// "$80k–$100k" → { min: 80000, max: 100000 }; "$80k+" → { min: 80000, max: ... }
function parseSalaryRange(range: string): { min: number; max: number } | null {
  // Strip $, commas
  const cleaned = range.replace(/[$,]/g, "");
  // Match patterns like "80k–100k", "80k-100k", "80000-100000"
  const rangeMatch = cleaned.match(/(\d+)\s*(k?)\s*[–\-]\s*(\d+)\s*(k?)/i);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]) * (rangeMatch[2].toLowerCase() === "k" ? 1000 : 1);
    const max = Number(rangeMatch[3]) * (rangeMatch[4].toLowerCase() === "k" ? 1000 : 1);
    return { min, max };
  }
  // single value with + or just number: "80k+" or "Up to 100k"
  const upToMatch = cleaned.match(/up to\s*(\d+)\s*(k?)/i);
  if (upToMatch) {
    const v = Number(upToMatch[1]) * (upToMatch[2].toLowerCase() === "k" ? 1000 : 1);
    return { min: 0, max: v };
  }
  const plusMatch = cleaned.match(/(\d+)\s*(k?)\s*\+/);
  if (plusMatch) {
    const v = Number(plusMatch[1]) * (plusMatch[2].toLowerCase() === "k" ? 1000 : 1);
    return { min: v, max: Number.MAX_SAFE_INTEGER };
  }
  return null;
}

// ─── Experience (15 pts) ──────────────────────────────────────────────────
function scoreExperience(
  experienceLevel: string | null,
  job: JobForScoring,
  reasons: string[]
): number {
  if (!experienceLevel) return 8; // partial credit, no preference

  const haystack = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const level = experienceLevel.toLowerCase();

  const senior = ["senior", "sr.", "lead", "principal", "staff"];
  const mid = ["mid", "intermediate"];
  const junior = ["junior", "jr.", "entry", "associate"];

  let matched = false;
  if (senior.includes(level)) {
    matched = senior.some((kw) => haystack.includes(kw));
  } else if (mid.includes(level)) {
    matched = mid.some((kw) => haystack.includes(kw));
  } else if (junior.includes(level)) {
    matched = junior.some((kw) => haystack.includes(kw));
  } else {
    matched = haystack.includes(level);
  }

  if (matched) {
    reasons.push(`Experience level matches (${experienceLevel})`);
    return 15;
  }

  return 5;
}

// ─── Industries (5 pts) ────────────────────────────────────────────────────
function scoreIndustries(
  industries: string[] | null,
  job: JobForScoring,
  reasons: string[]
): number {
  if (!industries || industries.length === 0) return 0;

  const haystack = `${job.company} ${job.description ?? ""}`.toLowerCase();
  const matched = industries.find((i) => haystack.includes(i.toLowerCase()));

  if (matched) {
    reasons.push(`Industry match: ${matched}`);
    return 5;
  }
  return 0;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}
