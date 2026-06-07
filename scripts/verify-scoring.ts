// Standalone checks for the match-scoring gates + factors.
// Run with: npx tsx scripts/verify-scoring.ts
//
// No test framework is configured in this project, so these are plain
// assertions over the pure scoring function in src/lib/matching/score.ts.

import assert from "node:assert";
import {
  scoreJobAgainstProfile,
  shouldIncludeMatch,
  type ProfileForScoring,
  type JobForScoring,
} from "../src/lib/matching/score";

const baseProfile: ProfileForScoring = {
  target_roles: ["Marketing Manager"],
  industries: ["healthcare"],
  locations: ["Chicago IL"],
  salary_min: 80000,
  salary_max: 120000,
  remote_preference: "remote",
  experience_level: "senior",
  keywords: ["brand"],
  skills: ["seo", "budgeting"],
  certifications: ["pmp"],
  preferred_employers: [],
  excluded_employers: [],
  must_haves: [],
  nice_to_haves: [],
};

const baseJob: JobForScoring = {
  title: "Senior Marketing Manager",
  company: "Mayo Clinic Healthcare",
  location: "Chicago, IL",
  is_remote: true,
  description: "Lead brand strategy. SEO and budgeting required. PMP preferred. Senior role.",
  salary_range: "$90k–$110k",
};

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("Scoring checks:");

check("strong match scores high and is included", () => {
  const r = scoreJobAgainstProfile(baseProfile, baseJob);
  assert.ok(r.score >= 80, `expected >=80, got ${r.score}`);
  assert.equal(r.label, "strong");
  assert.ok(shouldIncludeMatch(r.score));
  assert.ok(!r.excluded);
});

check("excluded employer forces score 0 + excluded", () => {
  const r = scoreJobAgainstProfile(
    { ...baseProfile, excluded_employers: ["Mayo Clinic"] },
    baseJob
  );
  assert.equal(r.score, 0);
  assert.equal(r.excluded, true);
  assert.ok(!shouldIncludeMatch(r.score));
});

check("unmet must-have excludes the job", () => {
  const r = scoreJobAgainstProfile(
    { ...baseProfile, must_haves: ["python wizard"] },
    baseJob
  );
  assert.equal(r.score, 0);
  assert.equal(r.excluded, true);
});

check("satisfied must-have does not exclude", () => {
  const r = scoreJobAgainstProfile(
    { ...baseProfile, must_haves: ["brand strategy"] },
    baseJob
  );
  assert.ok(!r.excluded);
  assert.ok(r.score >= 60);
});

check("preferred employer adds a bonus", () => {
  const without = scoreJobAgainstProfile(baseProfile, { ...baseJob, salary_range: null });
  const withPref = scoreJobAgainstProfile(
    { ...baseProfile, preferred_employers: ["Mayo Clinic"] },
    { ...baseJob, salary_range: null }
  );
  assert.ok(withPref.score > without.score, `expected bonus to raise score (${without.score} -> ${withPref.score})`);
});

check("irrelevant job falls below threshold", () => {
  const r = scoreJobAgainstProfile(baseProfile, {
    title: "Line Cook",
    company: "Local Diner",
    location: "Miami, FL",
    is_remote: false,
    description: "Prepare food in a busy kitchen.",
    salary_range: "$30k–$40k",
  });
  assert.ok(!shouldIncludeMatch(r.score), `expected exclusion, got ${r.score}`);
});

check("score never exceeds 100", () => {
  const r = scoreJobAgainstProfile(
    { ...baseProfile, preferred_employers: ["Mayo Clinic"], nice_to_haves: ["brand", "seo"] },
    baseJob
  );
  assert.ok(r.score <= 100, `got ${r.score}`);
});

console.log(`\n${passed} checks passed.`);
