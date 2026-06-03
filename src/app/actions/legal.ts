"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { JSONContent } from "@tiptap/react";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const p = profile as { role: string } | null;
  if (p?.role !== "admin") throw new Error("Unauthorized");
  return { supabase, user };
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export interface CurrentAgreement {
  id: string;
  version_label: string;
  title: string;
  content: JSONContent;
  published_at: string | null;
}

export interface LatestSigning {
  id: string;
  agreement_id: string;
  version_label: string;
  signed_full_name: string;
  signed_at: string;
}

export async function getCurrentAgreement(): Promise<CurrentAgreement | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("service_agreements")
    .select("id, version_label, title, content, published_at")
    .eq("is_current", true)
    .maybeSingle();
  return (data as CurrentAgreement | null) ?? null;
}

export async function getLatestSigningForUser(userId: string): Promise<LatestSigning | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("signed_service_agreements")
    .select("id, agreement_id, version_label, signed_full_name, signed_at")
    .eq("client_id", userId)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LatestSigning | null) ?? null;
}

// ─── Sign agreement (authenticated user) ──────────────────────────────────────

export interface SignAgreementResult {
  error?: string;
  id?: string;
  versionLabel?: string;
}

export async function signAgreement(signedFullName: string): Promise<SignAgreementResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const trimmedName = signedFullName.trim();
  if (trimmedName.length < 2) return { error: "Please type your full legal name." };

  const current = await getCurrentAgreement();
  if (!current) return { error: "No service agreement is currently published." };

  // Best-effort IP capture from edge headers
  let ipAddress: string | null = null;
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    ipAddress = fwd ? fwd.split(",")[0]?.trim() ?? null : null;
  } catch {
    /* headers() may throw in some contexts; safe to leave null */
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("signed_service_agreements")
    .insert({
      client_id: user.id,
      agreement_id: current.id,
      version_label: current.version_label,
      content_snapshot: current.content,
      signed_full_name: trimmedName,
      ip_address: ipAddress,
    })
    .select("id, version_label")
    .single();

  if (error || !data) {
    console.error("[signAgreement] insert failed:", error);
    return { error: "Couldn't record your signature. Please try again." };
  }

  const row = data as { id: string; version_label: string };
  return { id: row.id, versionLabel: row.version_label };
}

// ─── Admin: update draft + publish new version ────────────────────────────────

export interface AgreementDraftInput {
  title: string;
  content: JSONContent;
}

export async function updateAgreementDraft(input: AgreementDraftInput): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  if (!input.title?.trim()) return { error: "Title is required" };

  const service = createServiceClient();
  const { data: current } = await service
    .from("service_agreements")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();

  if (!current) return { error: "No current agreement to update. Publish a new version instead." };

  const currentRow = current as { id: string };
  const { error } = await service
    .from("service_agreements")
    .update({
      title: input.title.trim(),
      content: input.content,
    })
    .eq("id", currentRow.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/legal");
  revalidatePath("/legal/service-agreement");
  return {};
}

export interface PublishVersionInput extends AgreementDraftInput {
  versionLabel: string;
}

export async function publishNewVersion(input: PublishVersionInput): Promise<{ error?: string; id?: string }> {
  let user;
  try {
    ({ user } = await requireAdmin());
  } catch {
    return { error: "Unauthorized" };
  }

  if (!input.title?.trim()) return { error: "Title is required" };
  if (!input.versionLabel?.trim()) return { error: "Version label is required" };

  const service = createServiceClient();

  // Flip is_current off on any existing row (partial unique index enforces
  // single-current); ignore if no rows exist yet.
  await service
    .from("service_agreements")
    .update({ is_current: false })
    .eq("is_current", true);

  const { data, error } = await service
    .from("service_agreements")
    .insert({
      version_label: input.versionLabel.trim(),
      title: input.title.trim(),
      content: input.content,
      is_current: true,
      published_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to publish new version" };

  revalidatePath("/admin/legal");
  revalidatePath("/admin/legal/signed");
  revalidatePath("/legal/service-agreement");
  return { id: (data as { id: string }).id };
}

// ─── Server-action redirect helper for the booking-blocked case ───────────────

export async function redirectToOnboardingForSigning(): Promise<void> {
  redirect("/dashboard/onboarding#agreement");
}
