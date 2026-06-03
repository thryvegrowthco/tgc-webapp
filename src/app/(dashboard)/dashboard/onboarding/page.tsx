import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { generateHTML } from "@tiptap/html";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard, type OnboardingInitial } from "@/components/dashboard/OnboardingWizard";
import { getCurrentAgreement, getLatestSigningForUser } from "@/app/actions/legal";
import { legalRenderExtensions } from "@/lib/legal/extensions";
import type { ClientProfile } from "@/types/database";
import type { JSONContent } from "@tiptap/react";

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

  // Fetch the user's profile to default the typed-name field
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRaw as { full_name: string | null } | null;

  // Agreement + signing state
  const [currentAgreement, latestSigning] = await Promise.all([
    getCurrentAgreement(),
    getLatestSigningForUser(user.id),
  ]);

  const agreement: OnboardingInitial["agreement"] = currentAgreement
    ? {
        title: currentAgreement.title,
        versionLabel: currentAgreement.version_label,
        publishedAt: currentAgreement.published_at,
        bodyHtml: generateHTML(currentAgreement.content as JSONContent, legalRenderExtensions),
        alreadySignedVersion: latestSigning?.version_label ?? null,
        alreadySignedAt: latestSigning?.signed_at ?? null,
        alreadySignedFullName: latestSigning?.signed_full_name ?? null,
      }
    : null;

  const initial: OnboardingInitial = {
    location: existing?.location ?? null,
    timezone: existing?.timezone ?? null,
    pronouns: existing?.pronouns ?? null,
    currentPosition: existing?.current_position ?? null,
    company: existing?.company ?? null,
    industry: existing?.industry ?? null,
    yearsExperience: existing?.years_experience ?? null,
    primaryGoal: existing?.primary_goal ?? null,
    servicesInterested: (existing?.services_interested ?? []) as string[],
    preferredContactMethod: existing?.preferred_contact_method ?? null,
    availabilityNotes: existing?.availability_notes ?? null,
    hasResume: Boolean(existing?.resume_document_id),
    agreement,
    defaultFullName: profile?.full_name ?? null,
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
            ? "Tweak anything that's changed and save when you're ready."
            : "Tell me a bit about you so we can hit the ground running. Takes about four minutes."}
        </p>
      </div>

      <OnboardingWizard initial={initial} />
    </div>
  );
}
