"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require";
import { createServiceClient } from "@/lib/supabase/service";
import type { TestimonialStatus } from "@/types/database";

const MAX_QUOTE = 2000;
const MAX_NAME = 120;
const MAX_TITLE = 160;

function bumpBoth() {
  revalidatePath("/testimonials");
  revalidatePath("/admin/testimonials");
}

function cleanRating(rating: unknown): number | null {
  const n = typeof rating === "number" ? rating : parseInt(String(rating ?? ""), 10);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n);
}

// ─── Public submit (token bearer; no auth) ────────────────────────────────────

export interface SubmitTestimonialInput {
  token: string;
  quote: string;
  authorName: string;
  authorTitle?: string | null;
  rating?: number | null;
}

export async function submitTestimonial(
  input: SubmitTestimonialInput
): Promise<{ error?: string; success?: boolean }> {
  const quote = (input.quote ?? "").trim();
  const authorName = (input.authorName ?? "").trim();
  if (quote.length < 10) return { error: "Please share a little more — at least a sentence." };
  if (quote.length > MAX_QUOTE) return { error: "That's a bit long — please keep it under 2000 characters." };
  if (authorName.length < 2) return { error: "Please enter your name." };

  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, client_id, service_type")
    .eq("testimonial_token", input.token)
    .maybeSingle();
  if (!booking) return { error: "We couldn't find this link. It may be from an old email." };

  // One per booking — friendly message instead of leaking the unique violation.
  const { data: existing } = await supabase
    .from("testimonials")
    .select("id")
    .eq("booking_id", booking.id)
    .maybeSingle();
  if (existing) {
    return { error: "We already have your testimonial — thank you so much!" };
  }

  const { error } = await supabase.from("testimonials").insert({
    client_id: booking.client_id,
    booking_id: booking.id,
    quote,
    author_name: authorName.slice(0, MAX_NAME),
    author_title: input.authorTitle?.trim()?.slice(0, MAX_TITLE) || null,
    service_type: booking.service_type ?? null,
    rating: cleanRating(input.rating),
    status: "pending",
  });
  if (error) {
    // Unique-index race: another submit landed first.
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      return { error: "We already have your testimonial — thank you so much!" };
    }
    console.error("[submitTestimonial] insert failed:", error);
    return { error: "Something went wrong saving your testimonial. Please try again." };
  }

  return { success: true };
}

// ─── Admin (requireAdmin) ─────────────────────────────────────────────────────

export async function setTestimonialStatus(
  id: string,
  status: TestimonialStatus
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  if (!["pending", "approved", "hidden"].includes(status)) return { error: "Invalid status." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("testimonials")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  bumpBoth();
  return { success: true };
}

export interface TestimonialFields {
  quote: string;
  authorName: string;
  authorTitle?: string | null;
  serviceType?: string | null;
  rating?: number | null;
}

function validateFields(f: TestimonialFields): string | null {
  if (!f.quote?.trim()) return "A quote is required.";
  if (f.quote.trim().length > MAX_QUOTE) return "Quote is too long.";
  if (!f.authorName?.trim()) return "An author name is required.";
  return null;
}

export async function updateTestimonial(
  id: string,
  fields: TestimonialFields
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const invalid = validateFields(fields);
  if (invalid) return { error: invalid };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("testimonials")
    .update({
      quote: fields.quote.trim(),
      author_name: fields.authorName.trim().slice(0, MAX_NAME),
      author_title: fields.authorTitle?.trim()?.slice(0, MAX_TITLE) || null,
      service_type: fields.serviceType?.trim() || null,
      rating: cleanRating(fields.rating),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  bumpBoth();
  revalidatePath(`/admin/testimonials/${id}`);
  return { success: true };
}

export async function createTestimonial(
  fields: TestimonialFields & { status?: TestimonialStatus }
): Promise<{ error?: string; id?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const invalid = validateFields(fields);
  if (invalid) return { error: invalid };

  const status: TestimonialStatus = fields.status ?? "approved"; // manual entries are usually ready to show
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      quote: fields.quote.trim(),
      author_name: fields.authorName.trim().slice(0, MAX_NAME),
      author_title: fields.authorTitle?.trim()?.slice(0, MAX_TITLE) || null,
      service_type: fields.serviceType?.trim() || null,
      rating: cleanRating(fields.rating),
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create the testimonial." };

  bumpBoth();
  return { id: data.id };
}

export async function deleteTestimonial(id: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createServiceClient();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { error: error.message };

  bumpBoth();
  return { success: true };
}
