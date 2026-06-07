// Pure scoring function. No side effects. Given a client's watchlist
// preferences and a job listing, returns a score 0–100 and a label.
//
// Base factors (sum to 100):
//   title / role keywords ........... 30
//   keywords ........................ 12
//   skills .......................... 12
//   location / remote preference .... 18
//   salary band ..................... 10
//   experience level ................  8
//   certifications ..................  5
//   industries ......................  5
//
// Bonuses (added then clamped to 100):
//   preferred employer .............. +8
//   nice-to-haves ................... up to +5
//
// Hard gates (force exclusion regardless of score):
//   excluded employer matched ....... score 0, excluded
//   any must-have not satisfied ..... score 0, excluded
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
  // Expanded questionnaire (all optional so legacy callers still type-check)
  keywords?: string[] | null;
  skills?: string[] | null;
  certifications?: string[] | null;
  preferred_employers?: string[] | null;
  excluded_employers?: string[] | null;
  must_haves?: string[] | null;
  nice_to_haves?: string[] | null;
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
  /** True when a hard gate (excluded employer / unmet must-have) excluded the job. */
  excluded?: boolean;
}

const MATCH_THRESHOLD = 60;

// Per-factor maximums (base factors sum to 100).
const MAX_ROLES = 30;
const MAX_KEYWORDS = 12;
const MAX_SKILLS = 12;
const MAX_LOCATION = 18;
const MAX_SALARY = 10;
const MAX_EXPERIENCE = 8;
const MAX_CERTS = 5;
const MAX_INDUSTRY = 5;
const BONUS_PREFERRED_EMPLOYER = 8;
const BONUS_NICE_TO_HAVES = 5;

export function scoreJobAgainstProfile(
  profile: ProfileForScoring,
  job: JobForScoring
): ScoreResult {
  const reasons: string[] = [];
  const haystack = `${job.title} ${job.description ?? ""}`.toLowerCase();

  // ─── Hard gates first ──────────────────────────────────────────────────────
  const excludedHit = matchAny(profile.excluded_employers, job.company.toLowerCase());
  if (excludedHit) {
    return { score: 0, label: null, reasons: [`Excluded employer: ${excludedHit}`], excluded: true };
  }

  const missingMustHave = firstUnmet(profile.must_haves, haystack);
  if (missingMustHave) {
    return { score: 0, label: null, reasons: [`Missing must-have: ${missingMustHave}`], excluded: true };
  }

  // ─── Base factors ──────────────────────────────────────────────────────────
  const total =
    scoreRoles(profile.target_roles, job, reasons) +
    scoreKeywords(profile.keywords, haystack, reasons) +
    scoreSkills(profile.skills, haystack, reasons) +
    scoreLocation(profile, job, reasons) +
    scoreSalary(profile, job, reasons) +
    scoreExperience(profile.experience_level, haystack, reasons) +
    scoreCertifications(profile.certifications, haystack, reasons) +
    scoreIndustries(profile.industries, job, reasons) +
    scorePreferredEmployer(profile.preferred_employers, job.company.toLowerCase(), reasons) +
    scoreNiceToHaves(profile.nice_to_haves, haystack, reasons);

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

// ─── Role keywords (30 pts) ───────────────────────────────────────────────
function scoreRoles(
  targetRoles: string[] | null,
  job: JobForScoring,
  reasons: string[]
): number {
  if (!targetRoles || targetRoles.length === 0) return 0;

  const titleLower = job.title.toLowerCase();
  const descLower = (job.description ?? "").toLowerCase();

  let bestRoleScore = 0;
  let bestRole = "";

  for (const role of targetRoles) {
    const tokens = tokenize(role);
    if (tokens.length === 0) continue;

    const titleMatches = tokens.filter((t) => titleLower.includes(t)).length;
    const descMatches = tokens.filter((t) => descLower.includes(t)).length;

    // Title hit is worth more than a description hit.
    const ratio = titleMatches / tokens.length;
    const descRatio = descMatches / tokens.length;
    const roleScore = ratio * (MAX_ROLES * 0.75) + descRatio * (MAX_ROLES * 0.25);

    if (roleScore > bestRoleScore) {
      bestRoleScore = roleScore;
      bestRole = role;
    }
  }

  if (bestRoleScore > 0) {
    reasons.push(`Title/description match for "${bestRole}"`);
  }

  return Math.min(MAX_ROLES, bestRoleScore);
}

// ─── Keywords (12 pts) ────────────────────────────────────────────────────
function scoreKeywords(keywords: string[] | null | undefined, haystack: string, reasons: string[]): number {
  const list = (keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return 0;
  const hits = list.filter((k) => haystack.includes(k));
  if (hits.length === 0) return 0;
  reasons.push(`Keyword match: ${hits.slice(0, 3).join(", ")}`);
  return Math.min(MAX_KEYWORDS, (hits.length / list.length) * MAX_KEYWORDS);
}

// ─── Skills (12 pts) ──────────────────────────────────────────────────────
function scoreSkills(skills: string[] | null | undefined, haystack: string, reasons: string[]): number {
  const list = (skills ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return 0;
  const hits = list.filter((s) => haystack.includes(s));
  if (hits.length === 0) return 0;
  reasons.push(`Skills match: ${hits.slice(0, 3).join(", ")}`);
  return Math.min(MAX_SKILLS, (hits.length / list.length) * MAX_SKILLS);
}

// ─── Certifications (5 pts) ───────────────────────────────────────────────
function scoreCertifications(certs: string[] | null | undefined, haystack: string, reasons: string[]): number {
  const list = (certs ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return 0;
  const hits = list.filter((c) => haystack.includes(c));
  if (hits.length === 0) return 0;
  reasons.push(`Certification match: ${hits.slice(0, 2).join(", ")}`);
  return Math.min(MAX_CERTS, (hits.length / list.length) * MAX_CERTS);
}

// ─── Location / remote (18 pts) ────────────────────────────────────────────
function scoreLocation(
  profile: ProfileForScoring,
  job: JobForScoring,
  reasons: string[]
): number {
  const pref = profile.remote_preference;

  if (pref === "remote") {
    if (job.is_remote) {
      reasons.push("Remote, matches preference");
      return MAX_LOCATION;
    }
    return 0;
  }

  if (pref === "any" || !pref) {
    if (job.is_remote) reasons.push("Remote (open preference)");
    else reasons.push("Open to any work arrangement");
    return MAX_LOCATION;
  }

  // hybrid or onsite — check location overlap
  const locations = profile.locations ?? [];
  if (locations.length === 0) return MAX_LOCATION * 0.6; // partial credit, no city pref

  const jobLoc = (job.location ?? "").toLowerCase();
  const matched = locations.find((l) => jobLoc.includes(l.toLowerCase()));

  if (matched) {
    reasons.push(`Location match: ${matched}`);
    return MAX_LOCATION;
  }

  if (job.is_remote && pref === "hybrid") {
    reasons.push("Remote (hybrid preference)");
    return MAX_LOCATION * 0.6;
  }

  return 0;
}

// ─── Salary (10 pts) ───────────────────────────────────────────────────────
function scoreSalary(
  profile: ProfileForScoring,
  job: JobForScoring,
  reasons: string[]
): number {
  const profileMin = profile.salary_min ?? 0;
  const profileMax = profile.salary_max ?? 0;

  if (profileMin === 0 && profileMax === 0) return MAX_SALARY * 0.6; // no preference

  if (!job.salary_range) return MAX_SALARY * 0.4; // unknown salary, neutral partial

  const jobBand = parseSalaryRange(job.salary_range);
  if (!jobBand) return MAX_SALARY * 0.4;

  const minOK = profileMin === 0 || jobBand.max >= profileMin;
  const maxOK = profileMax === 0 || jobBand.min <= profileMax;

  if (minOK && maxOK) {
    reasons.push(`Salary in range (${job.salary_range})`);
    return MAX_SALARY;
  }

  if (minOK || maxOK) {
    reasons.push("Partial salary overlap");
    return MAX_SALARY * 0.5;
  }

  return 0;
}

// "$80k–$100k" → { min: 80000, max: 100000 }; "$80k+" → { min: 80000, max: ... }
function parseSalaryRange(range: string): { min: number; max: number } | null {
  const cleaned = range.replace(/[$,]/g, "");
  const rangeMatch = cleaned.match(/(\d+)\s*(k?)\s*[–\-]\s*(\d+)\s*(k?)/i);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]) * (rangeMatch[2].toLowerCase() === "k" ? 1000 : 1);
    const max = Number(rangeMatch[3]) * (rangeMatch[4].toLowerCase() === "k" ? 1000 : 1);
    return { min, max };
  }
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

// ─── Experience (8 pts) ───────────────────────────────────────────────────
function scoreExperience(
  experienceLevel: string | null,
  haystack: string,
  reasons: string[]
): number {
  if (!experienceLevel) return MAX_EXPERIENCE * 0.6; // no preference

  const level = experienceLevel.toLowerCase();

  const senior = ["senior", "sr.", "lead", "principal", "staff", "director", "vp", "executive"];
  const mid = ["mid", "intermediate"];
  const junior = ["junior", "jr.", "entry", "associate"];

  let matched = false;
  if (senior.some((kw) => level.includes(kw))) {
    matched = senior.some((kw) => haystack.includes(kw));
  } else if (mid.some((kw) => level.includes(kw))) {
    matched = mid.some((kw) => haystack.includes(kw));
  } else if (junior.some((kw) => level.includes(kw))) {
    matched = junior.some((kw) => haystack.includes(kw));
  } else {
    matched = haystack.includes(level);
  }

  if (matched) {
    reasons.push(`Experience level matches (${experienceLevel})`);
    return MAX_EXPERIENCE;
  }

  return MAX_EXPERIENCE * 0.4;
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
    return MAX_INDUSTRY;
  }
  return 0;
}

// ─── Preferred employer bonus (+8) ─────────────────────────────────────────
function scorePreferredEmployer(
  preferred: string[] | null | undefined,
  companyLower: string,
  reasons: string[]
): number {
  const hit = matchAny(preferred, companyLower);
  if (hit) {
    reasons.push(`Employer of interest: ${hit}`);
    return BONUS_PREFERRED_EMPLOYER;
  }
  return 0;
}

// ─── Nice-to-haves bonus (up to +5) ────────────────────────────────────────
function scoreNiceToHaves(items: string[] | null | undefined, haystack: string, reasons: string[]): number {
  const list = (items ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return 0;
  const hits = list.filter((n) => phraseMatch(n, haystack));
  if (hits.length === 0) return 0;
  reasons.push(`Nice-to-have: ${hits.slice(0, 2).join(", ")}`);
  return Math.min(BONUS_NICE_TO_HAVES, (hits.length / list.length) * BONUS_NICE_TO_HAVES);
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

// True if `phrase` is satisfied in `haystack`: either the full lowercased
// phrase appears, or all of its 3+ char tokens appear.
function phraseMatch(phrase: string, haystack: string): boolean {
  const p = phrase.trim().toLowerCase();
  if (!p) return false;
  if (haystack.includes(p)) return true;
  const tokens = tokenize(p);
  return tokens.length > 0 && tokens.every((t) => haystack.includes(t));
}

// Returns the first list entry that appears as a substring of `target`, else null.
function matchAny(list: string[] | null | undefined, target: string): string | null {
  for (const raw of list ?? []) {
    const v = raw.trim().toLowerCase();
    if (v && target.includes(v)) return raw.trim();
  }
  return null;
}

// Returns the first must-have phrase NOT satisfied by the haystack, else null.
function firstUnmet(mustHaves: string[] | null | undefined, haystack: string): string | null {
  for (const raw of mustHaves ?? []) {
    const v = raw.trim();
    if (v && !phraseMatch(v, haystack)) return v;
  }
  return null;
}
