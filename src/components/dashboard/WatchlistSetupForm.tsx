"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveWatchlistProfile, updateWatchlistProfileAsAdmin } from "@/app/actions/watchlist";
import { Button } from "@/components/ui/button";

export interface WatchlistFormInitialData {
  targetRoles: string[];
  industries: string[];
  locations: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  remotePreference: string;
  experienceLevel: string | null;
  preferencesNotes: string | null;
  employmentTypes: string[];
  keywords: string[];
  skills: string[];
  certifications: string[];
  education: string | null;
  preferredEmployers: string[];
  excludedEmployers: string[];
  jobBoardPreferences: string[];
  workEnvironment: string | null;
  travelPreference: string | null;
  workAuthorizationNotes: string | null;
  mustHaves: string[];
  niceToHaves: string[];
}

interface Props {
  initialData?: WatchlistFormInitialData | null;
  /** When set, the form edits this client's profile as an admin (no redirect). */
  adminClientId?: string;
}

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
];

function tagsToString(arr: string[] | null | undefined): string {
  return (arr ?? []).join(", ");
}

function stringToTags(str: string): string[] {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function WatchlistSetupForm({ initialData, adminClientId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const [targetRoles, setTargetRoles] = React.useState(tagsToString(initialData?.targetRoles));
  const [industries, setIndustries] = React.useState(tagsToString(initialData?.industries));
  const [locations, setLocations] = React.useState(tagsToString(initialData?.locations));
  const [salaryMin, setSalaryMin] = React.useState(initialData?.salaryMin?.toString() ?? "");
  const [salaryMax, setSalaryMax] = React.useState(initialData?.salaryMax?.toString() ?? "");
  const [remotePreference, setRemotePreference] = React.useState(initialData?.remotePreference ?? "any");
  const [experienceLevel, setExperienceLevel] = React.useState(initialData?.experienceLevel ?? "");
  const [employmentTypes, setEmploymentTypes] = React.useState<string[]>(initialData?.employmentTypes ?? []);
  const [keywords, setKeywords] = React.useState(tagsToString(initialData?.keywords));
  const [skills, setSkills] = React.useState(tagsToString(initialData?.skills));
  const [certifications, setCertifications] = React.useState(tagsToString(initialData?.certifications));
  const [education, setEducation] = React.useState(initialData?.education ?? "");
  const [preferredEmployers, setPreferredEmployers] = React.useState(tagsToString(initialData?.preferredEmployers));
  const [excludedEmployers, setExcludedEmployers] = React.useState(tagsToString(initialData?.excludedEmployers));
  const [jobBoardPreferences, setJobBoardPreferences] = React.useState(tagsToString(initialData?.jobBoardPreferences));
  const [workEnvironment, setWorkEnvironment] = React.useState(initialData?.workEnvironment ?? "");
  const [travelPreference, setTravelPreference] = React.useState(initialData?.travelPreference ?? "");
  const [workAuthorizationNotes, setWorkAuthorizationNotes] = React.useState(initialData?.workAuthorizationNotes ?? "");
  const [mustHaves, setMustHaves] = React.useState(tagsToString(initialData?.mustHaves));
  const [niceToHaves, setNiceToHaves] = React.useState(tagsToString(initialData?.niceToHaves));
  const [preferencesNotes, setPreferencesNotes] = React.useState(initialData?.preferencesNotes ?? "");

  function toggleEmploymentType(value: string) {
    setEmploymentTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      targetRoles: stringToTags(targetRoles),
      industries: stringToTags(industries),
      locations: stringToTags(locations),
      salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
      salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
      remotePreference: remotePreference as "remote" | "hybrid" | "onsite" | "any",
      experienceLevel,
      employmentTypes,
      keywords: stringToTags(keywords),
      skills: stringToTags(skills),
      certifications: stringToTags(certifications),
      education,
      preferredEmployers: stringToTags(preferredEmployers),
      excludedEmployers: stringToTags(excludedEmployers),
      jobBoardPreferences: stringToTags(jobBoardPreferences),
      workEnvironment,
      travelPreference,
      workAuthorizationNotes,
      mustHaves: stringToTags(mustHaves),
      niceToHaves: stringToTags(niceToHaves),
      preferencesNotes,
    };

    if (adminClientId) {
      const result = await updateWatchlistProfileAsAdmin(adminClientId, payload);
      setSaving(false);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Watchlist criteria updated.");
        router.refresh();
      }
      return;
    }

    await saveWatchlistProfile(payload);
    // saveWatchlistProfile redirects on success
  }

  const fieldClass =
    "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-neutral-700 mb-1.5";
  const hintClass = "text-xs text-neutral-400 mt-1";
  const sectionClass = "text-xs font-semibold uppercase tracking-wide text-neutral-500 pt-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Basics ── */}
      <p className={sectionClass}>The basics</p>

      <div>
        <label className={labelClass}>
          Target Job Titles / Roles <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Marketing Manager, Brand Strategist, Content Lead"
          value={targetRoles}
          onChange={(e) => setTargetRoles(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Separate multiple roles with commas.</p>
      </div>

      <div>
        <label className={labelClass}>Preferred Industries</label>
        <input
          type="text"
          placeholder="e.g. Tech, Healthcare, Nonprofits"
          value={industries}
          onChange={(e) => setIndustries(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Leave blank to match any industry.</p>
      </div>

      <div>
        <label className={labelClass}>Preferred Locations</label>
        <input
          type="text"
          placeholder="e.g. Chicago IL, New York NY"
          value={locations}
          onChange={(e) => setLocations(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>City + state preferred. Separate with commas.</p>
      </div>

      <div>
        <label className={labelClass}>Work Location Preference</label>
        <select value={remotePreference} onChange={(e) => setRemotePreference(e.target.value)} className={fieldClass}>
          <option value="any">Open to anything</option>
          <option value="remote">Remote only</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site only</option>
        </select>
      </div>

      {/* ── Compensation & type ── */}
      <p className={sectionClass}>Compensation &amp; type</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Salary Min ($/year)</label>
          <input
            type="number"
            placeholder="e.g. 70000"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            min={0}
            step={1000}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Salary Max ($/year)</label>
          <input
            type="number"
            placeholder="e.g. 120000"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            min={0}
            step={1000}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Employment Type</label>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT_TYPES.map((t) => {
            const active = employmentTypes.includes(t.value);
            return (
              <button
                type="button"
                key={t.value}
                onClick={() => toggleEmploymentType(t.value)}
                aria-pressed={active}
                className={
                  "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                  (active
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelClass}>Experience Level</label>
        <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className={fieldClass}>
          <option value="">Not specified</option>
          <option value="entry">Entry level (0–2 years)</option>
          <option value="mid">Mid level (3–5 years)</option>
          <option value="senior">Senior (6–10 years)</option>
          <option value="lead">Lead / Principal (10+ years)</option>
          <option value="executive">Executive / Director / VP+</option>
        </select>
      </div>

      {/* ── Professional profile ── */}
      <p className={sectionClass}>Your professional profile</p>

      <div>
        <label className={labelClass}>Keywords</label>
        <input
          type="text"
          placeholder="e.g. employer branding, go-to-market, B2B SaaS"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Terms that should appear in the job. Comma-separated.</p>
      </div>

      <div>
        <label className={labelClass}>Skills</label>
        <input
          type="text"
          placeholder="e.g. SEO, budgeting, people management"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Comma-separated.</p>
      </div>

      <div>
        <label className={labelClass}>Certifications</label>
        <input
          type="text"
          placeholder="e.g. PMP, SHRM-CP, Google Analytics"
          value={certifications}
          onChange={(e) => setCertifications(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Comma-separated.</p>
      </div>

      <div>
        <label className={labelClass}>Education</label>
        <input
          type="text"
          placeholder="e.g. Bachelor's in Marketing, MBA"
          value={education}
          onChange={(e) => setEducation(e.target.value)}
          className={fieldClass}
        />
      </div>

      {/* ── Employers ── */}
      <p className={sectionClass}>Employers</p>

      <div>
        <label className={labelClass}>Employers of Interest</label>
        <input
          type="text"
          placeholder="e.g. Google, Mayo Clinic, City of Chicago"
          value={preferredEmployers}
          onChange={(e) => setPreferredEmployers(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Roles at these companies get a boost. Comma-separated.</p>
      </div>

      <div>
        <label className={labelClass}>Employers to Exclude</label>
        <input
          type="text"
          placeholder="e.g. current employer, competitors to avoid"
          value={excludedEmployers}
          onChange={(e) => setExcludedEmployers(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Jobs at these companies are filtered out entirely.</p>
      </div>

      <div>
        <label className={labelClass}>Job Boards to Search</label>
        <input
          type="text"
          placeholder="e.g. LinkedIn, Indeed, Government, Nonprofit"
          value={jobBoardPreferences}
          onChange={(e) => setJobBoardPreferences(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Helps Rachel know where to focus. Comma-separated.</p>
      </div>

      {/* ── Preferences & constraints ── */}
      <p className={sectionClass}>Preferences &amp; constraints</p>

      <div>
        <label className={labelClass}>Preferred Work Environment</label>
        <input
          type="text"
          placeholder="e.g. mission-driven, fast-paced startup, stable corporate"
          value={workEnvironment}
          onChange={(e) => setWorkEnvironment(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass}>Travel Requirements</label>
        <select value={travelPreference} onChange={(e) => setTravelPreference(e.target.value)} className={fieldClass}>
          <option value="">No preference</option>
          <option value="none">No travel</option>
          <option value="occasional">Occasional travel OK</option>
          <option value="frequent">Frequent travel OK</option>
          <option value="willing">Open to anything</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Work Authorization Notes</label>
        <textarea
          rows={2}
          placeholder="e.g. U.S. citizen, or: require visa sponsorship"
          value={workAuthorizationNotes}
          onChange={(e) => setWorkAuthorizationNotes(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass}>Must-Have Criteria</label>
        <input
          type="text"
          placeholder="e.g. remote, 4 weeks PTO, manager title"
          value={mustHaves}
          onChange={(e) => setMustHaves(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Deal-breakers — jobs missing any of these are excluded. Comma-separated.</p>
      </div>

      <div>
        <label className={labelClass}>Nice-To-Have Criteria</label>
        <input
          type="text"
          placeholder="e.g. equity, 401k match, dog-friendly"
          value={niceToHaves}
          onChange={(e) => setNiceToHaves(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Bonus points when present. Comma-separated.</p>
      </div>

      <div>
        <label className={labelClass}>Additional Notes for Rachel</label>
        <textarea
          rows={4}
          placeholder="Anything else Rachel should know: company culture preferences, timeline, etc."
          value={preferencesNotes}
          onChange={(e) => setPreferencesNotes(e.target.value)}
          className={fieldClass}
        />
      </div>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : initialData ? "Update Preferences" : "Save Preferences"}
      </Button>
    </form>
  );
}
