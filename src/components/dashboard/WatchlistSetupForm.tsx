"use client";

import * as React from "react";
import { saveWatchlistProfile } from "@/app/actions/watchlist";
import { Button } from "@/components/ui/button";

interface Props {
  initialData?: {
    targetRoles: string[];
    industries: string[];
    locations: string[];
    salaryMin: number | null;
    salaryMax: number | null;
    remotePreference: string;
    experienceLevel: string | null;
    preferencesNotes: string | null;
  } | null;
}

function tagsToString(arr: string[] | null | undefined): string {
  return (arr ?? []).join(", ");
}

function stringToTags(str: string): string[] {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function WatchlistSetupForm({ initialData }: Props) {
  const [saving, setSaving] = React.useState(false);

  const [targetRoles, setTargetRoles] = React.useState(
    tagsToString(initialData?.targetRoles)
  );
  const [industries, setIndustries] = React.useState(
    tagsToString(initialData?.industries)
  );
  const [locations, setLocations] = React.useState(
    tagsToString(initialData?.locations)
  );
  const [salaryMin, setSalaryMin] = React.useState(
    initialData?.salaryMin?.toString() ?? ""
  );
  const [salaryMax, setSalaryMax] = React.useState(
    initialData?.salaryMax?.toString() ?? ""
  );
  const [remotePreference, setRemotePreference] = React.useState(
    initialData?.remotePreference ?? "any"
  );
  const [experienceLevel, setExperienceLevel] = React.useState(
    initialData?.experienceLevel ?? ""
  );
  const [preferencesNotes, setPreferencesNotes] = React.useState(
    initialData?.preferencesNotes ?? ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await saveWatchlistProfile({
      targetRoles: stringToTags(targetRoles),
      industries: stringToTags(industries),
      locations: stringToTags(locations),
      salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
      salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
      remotePreference: remotePreference as "remote" | "hybrid" | "onsite" | "any",
      experienceLevel,
      preferencesNotes,
    });
    // saveWatchlistProfile redirects on success
  }

  const fieldClass =
    "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-neutral-700 mb-1.5";
  const hintClass = "text-xs text-neutral-400 mt-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Target Roles */}
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

      {/* Industries */}
      <div>
        <label className={labelClass}>Industries</label>
        <input
          type="text"
          placeholder="e.g. Tech, Healthcare, Nonprofits"
          value={industries}
          onChange={(e) => setIndustries(e.target.value)}
          className={fieldClass}
        />
        <p className={hintClass}>Leave blank to match any industry.</p>
      </div>

      {/* Locations */}
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

      {/* Remote preference */}
      <div>
        <label className={labelClass}>Work Location Preference</label>
        <select
          value={remotePreference}
          onChange={(e) => setRemotePreference(e.target.value)}
          className={fieldClass}
        >
          <option value="any">Open to anything</option>
          <option value="remote">Remote only</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site only</option>
        </select>
      </div>

      {/* Salary range */}
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

      {/* Experience level */}
      <div>
        <label className={labelClass}>Experience Level</label>
        <select
          value={experienceLevel}
          onChange={(e) => setExperienceLevel(e.target.value)}
          className={fieldClass}
        >
          <option value="">Not specified</option>
          <option value="entry">Entry level (0–2 years)</option>
          <option value="mid">Mid level (3–5 years)</option>
          <option value="senior">Senior (6–10 years)</option>
          <option value="lead">Lead / Principal (10+ years)</option>
          <option value="director">Director / VP+</option>
        </select>
      </div>

      {/* Notes for Rachel */}
      <div>
        <label className={labelClass}>Notes for Rachel</label>
        <textarea
          rows={4}
          placeholder="Anything else Rachel should know — deal-breakers, company culture preferences, industries to avoid, etc."
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
