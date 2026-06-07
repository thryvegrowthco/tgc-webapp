import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { WatchlistSetupForm } from "@/components/dashboard/WatchlistSetupForm";
import type { Database } from "@/types/database";

export default async function WatchlistSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("watchlist_profiles")
    .select("*")
    .eq("client_id", user.id)
    .maybeSingle();

  type ProfileRow = Database["public"]["Tables"]["watchlist_profiles"]["Row"];

  const profile = profileRaw as ProfileRow | null;

  const initialData = profile
    ? {
        targetRoles: profile.target_roles ?? [],
        industries: profile.industries ?? [],
        locations: profile.locations ?? [],
        salaryMin: profile.salary_min,
        salaryMax: profile.salary_max,
        remotePreference: profile.remote_preference ?? "any",
        experienceLevel: profile.experience_level,
        preferencesNotes: profile.preferences_notes,
        employmentTypes: profile.employment_types ?? [],
        keywords: profile.keywords ?? [],
        skills: profile.skills ?? [],
        certifications: profile.certifications ?? [],
        education: profile.education,
        preferredEmployers: profile.preferred_employers ?? [],
        excludedEmployers: profile.excluded_employers ?? [],
        jobBoardPreferences: profile.job_board_preferences ?? [],
        workEnvironment: profile.work_environment,
        travelPreference: profile.travel_preference,
        workAuthorizationNotes: profile.work_authorization_notes,
        mustHaves: profile.must_haves ?? [],
        niceToHaves: profile.nice_to_haves ?? [],
      }
    : null;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Job Watchlist", href: "/dashboard/watchlist" },
          { label: "Preferences" },
        ]} />
      </div>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          {profile ? "Edit Your Preferences" : "Set Up Your Watchlist"}
        </h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Tell Rachel what you&apos;re looking for so she can curate the right matches.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <WatchlistSetupForm initialData={initialData} />
      </div>
    </div>
  );
}
