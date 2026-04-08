import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WatchlistSetupForm } from "@/components/dashboard/WatchlistSetupForm";

export default async function WatchlistSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("watchlist_profiles")
    .select(
      "target_roles, industries, locations, salary_min, salary_max, remote_preference, experience_level, preferences_notes"
    )
    .eq("client_id", user.id)
    .maybeSingle();

  type ProfileRow = {
    target_roles: string[] | null;
    industries: string[] | null;
    locations: string[] | null;
    salary_min: number | null;
    salary_max: number | null;
    remote_preference: string | null;
    experience_level: string | null;
    preferences_notes: string | null;
  };

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
      }
    : null;

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/watchlist"
        className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:text-brand-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Watchlist
      </Link>

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
