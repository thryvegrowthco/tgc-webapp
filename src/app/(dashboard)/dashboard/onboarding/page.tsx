import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard, type OnboardingInitial } from "@/components/dashboard/OnboardingWizard";
import type { ClientProfile } from "@/types/database";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existingRaw } = await supabase
    .from("client_profiles")
    .select("*")
    .eq("client_id", user.id)
    .maybeSingle();

  const existing = existingRaw as ClientProfile | null;

  const initial: OnboardingInitial = {
    location: existing?.location ?? null,
    timezone: existing?.timezone ?? null,
    pronouns: existing?.pronouns ?? null,
    currentRole: existing?.current_role ?? null,
    company: existing?.company ?? null,
    industry: existing?.industry ?? null,
    yearsExperience: existing?.years_experience ?? null,
    primaryGoal: existing?.primary_goal ?? null,
    servicesInterested: (existing?.services_interested ?? []) as string[],
    preferredContactMethod: existing?.preferred_contact_method ?? null,
    availabilityNotes: existing?.availability_notes ?? null,
    hasResume: Boolean(existing?.resume_document_id),
  };

  const isUpdate = Boolean(existing?.completed_at);

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>

      <div className="mb-8 max-w-2xl mx-auto text-center">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900">
          {isUpdate ? "Update your profile" : "Welcome to Thryve."}
        </h1>
        <p className="text-neutral-500 mt-2">
          {isUpdate
            ? "Tweak anything that&apos;s changed and save when you&apos;re ready."
            : "Tell me a bit about you so we can hit the ground running. Takes about three minutes."}
        </p>
      </div>

      <OnboardingWizard initial={initial} />
    </div>
  );
}
