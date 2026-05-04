"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const SERVICES_ALLOWLIST = new Set([
  "coaching",
  "interview_prep",
  "resume",
  "watchlist",
  "hr_consulting",
  "culture",
]);

const CONTACT_ALLOWLIST = new Set(["email", "phone", "text"]);

const ACCEPTED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_RESUME_BYTES = 25 * 1024 * 1024; // 25 MB

export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const location = trimOrNull(formData.get("location"));
  const timezone = trimOrNull(formData.get("timezone"));
  const pronouns = trimOrNull(formData.get("pronouns"));

  const currentRole = trimOrNull(formData.get("currentRole"));
  const company = trimOrNull(formData.get("company"));
  const industry = trimOrNull(formData.get("industry"));
  const yearsExperience = trimOrNull(formData.get("yearsExperience"));

  const primaryGoal = trimOrNull(formData.get("primaryGoal"));
  const servicesInterestedRaw = formData.getAll("servicesInterested");
  const servicesInterested = servicesInterestedRaw
    .map((v) => String(v))
    .filter((v) => SERVICES_ALLOWLIST.has(v));

  const preferredContactRaw = trimOrNull(formData.get("preferredContactMethod"));
  const preferredContactMethod = preferredContactRaw && CONTACT_ALLOWLIST.has(preferredContactRaw)
    ? (preferredContactRaw as "email" | "phone" | "text")
    : null;
  const availabilityNotes = trimOrNull(formData.get("availabilityNotes"));

  // Optional resume upload — bypasses the admin-only uploadDocument action
  // because clients need to upload their OWN resume during onboarding.
  let resumeDocumentId: string | null = null;
  const resumeFile = formData.get("resume") as File | null;
  if (resumeFile && resumeFile.size > 0) {
    if (!ACCEPTED_RESUME_TYPES.has(resumeFile.type)) {
      return { error: "Resume must be a PDF or Word document." };
    }
    if (resumeFile.size > MAX_RESUME_BYTES) {
      return { error: "Resume file is too large (25 MB max)." };
    }

    const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${user.id}/${Date.now()}-${safeName}`;

    const serviceClient = createServiceClient();
    const arrayBuffer = await resumeFile.arrayBuffer();

    const { error: uploadError } = await serviceClient.storage
      .from("documents")
      .upload(storagePath, arrayBuffer, {
        contentType: resumeFile.type,
        upsert: false,
      });
    if (uploadError) {
      console.error("[saveOnboarding] resume upload failed:", uploadError);
      return { error: "Couldn't upload resume. Please try again." };
    }

    const { data: docRow, error: docError } = await serviceClient
      .from("documents")
      .insert({
        client_id: user.id,
        uploaded_by: user.id,
        filename: resumeFile.name,
        storage_path: storagePath,
        file_size_bytes: resumeFile.size,
        category: "resume",
        description: "Uploaded during onboarding",
      })
      .select("id")
      .single();

    if (docError || !docRow) {
      await serviceClient.storage.from("documents").remove([storagePath]);
      console.error("[saveOnboarding] document row insert failed:", docError);
      return { error: "Couldn't save resume. Please try again." };
    }

    resumeDocumentId = (docRow as { id: string }).id;
  }

  // Upsert client_profiles row, marking completed_at on this submit
  const payload = {
    client_id: user.id,
    location,
    timezone,
    pronouns,
    current_role: currentRole,
    company,
    industry,
    years_experience: yearsExperience,
    primary_goal: primaryGoal,
    services_interested: servicesInterested.length > 0 ? servicesInterested : null,
    preferred_contact_method: preferredContactMethod,
    availability_notes: availabilityNotes,
    resume_document_id: resumeDocumentId,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Use the user's session client so RLS verifies ownership
  const { data: existing } = await supabase
    .from("client_profiles")
    .select("id, resume_document_id")
    .eq("client_id", user.id)
    .maybeSingle();

  if (existing) {
    // If there was already a resume linked and this submit didn't include
    // a new file, preserve the existing link rather than nulling it out.
    const finalPayload = resumeDocumentId
      ? payload
      : { ...payload, resume_document_id: (existing as { resume_document_id: string | null }).resume_document_id };

    await supabase.from("client_profiles").update(finalPayload).eq("client_id", user.id);
  } else {
    await supabase.from("client_profiles").insert(payload);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/onboarding");
  redirect("/dashboard?onboarded=1");
}

function trimOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 2000) : null;
}
