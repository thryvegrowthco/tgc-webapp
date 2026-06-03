"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeInterests } from "@/lib/newsletter/interests";
import { sendIssue } from "@/lib/email/newsletter-send";
import { syncNewsletterSubscriber } from "@/lib/gohighlevel/client";
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

// ─── Issues ───────────────────────────────────────────────────────────────────

export interface IssueFormInput {
  title: string;
  subject: string;
  preheader: string;
  content: JSONContent;
  target_interests: string[];
  featured_blog_post_id?: string | null;
  template_id?: string | null;
}

export async function createIssue(
  input: IssueFormInput
): Promise<{ error?: string; id?: string }> {
  let user;
  try {
    ({ user } = await requireAdmin());
  } catch {
    return { error: "Unauthorized" };
  }

  if (!input.title?.trim()) return { error: "Title is required" };

  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from("newsletter_issues")
    .insert({
      title: input.title.trim(),
      subject: input.subject?.trim() ?? "",
      preheader: input.preheader?.trim() ?? "",
      content: input.content,
      target_interests: sanitizeInterests(input.target_interests),
      featured_blog_post_id: input.featured_blog_post_id ?? null,
      template_id: input.template_id ?? null,
      author_id: user.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !row) return { error: error?.message ?? "Failed to create issue" };

  revalidatePath("/admin/newsletter/issues");
  return { id: (row as { id: string }).id };
}

export async function updateIssue(
  id: string,
  input: IssueFormInput
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  if (!input.title?.trim()) return { error: "Title is required" };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("newsletter_issues")
    .update({
      title: input.title.trim(),
      subject: input.subject?.trim() ?? "",
      preheader: input.preheader?.trim() ?? "",
      content: input.content,
      target_interests: sanitizeInterests(input.target_interests),
      featured_blog_post_id: input.featured_blog_post_id ?? null,
      template_id: input.template_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["draft", "pending_approval", "scheduled"]);

  if (error) return { error: error.message };

  revalidatePath(`/admin/newsletter/issues/${id}`);
  revalidatePath("/admin/newsletter/issues");
  return {};
}

export async function submitForApproval(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("newsletter_issues")
    .update({ status: "pending_approval", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath(`/admin/newsletter/issues/${id}`);
  revalidatePath("/admin/newsletter/issues");
  return {};
}

export async function approveAndSchedule(
  id: string,
  scheduledFor: string
): Promise<{ error?: string }> {
  let user;
  try {
    ({ user } = await requireAdmin());
  } catch {
    return { error: "Unauthorized" };
  }

  const when = new Date(scheduledFor);
  if (isNaN(when.getTime())) return { error: "Invalid scheduled date" };
  if (when.getTime() < Date.now() + 5 * 60 * 1000) {
    return { error: "Schedule must be at least 5 minutes in the future" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("newsletter_issues")
    .update({
      status: "scheduled",
      scheduled_for: when.toISOString(),
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["draft", "pending_approval"]);

  if (error) return { error: error.message };
  revalidatePath(`/admin/newsletter/issues/${id}`);
  revalidatePath("/admin/newsletter/issues");
  revalidatePath("/admin/newsletter");
  return {};
}

export async function unscheduleIssue(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("newsletter_issues")
    .update({
      status: "draft",
      scheduled_for: null,
      approved_by: null,
      approved_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "scheduled");

  if (error) return { error: error.message };
  revalidatePath(`/admin/newsletter/issues/${id}`);
  revalidatePath("/admin/newsletter/issues");
  return {};
}

export async function approveAndSendNow(
  id: string
): Promise<{ error?: string; sent?: number; failed?: number }> {
  let user;
  try {
    ({ user } = await requireAdmin());
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { error: approveError } = await supabase
    .from("newsletter_issues")
    .update({
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["draft", "pending_approval", "scheduled"]);

  if (approveError) return { error: approveError.message };

  try {
    const result = await sendIssue(id);
    revalidatePath(`/admin/newsletter/issues/${id}`);
    revalidatePath("/admin/newsletter/issues");
    revalidatePath("/admin/newsletter");
    return { sent: result.sent, failed: result.failed };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Send failed" };
  }
}

export async function duplicateIssue(
  id: string
): Promise<{ error?: string; id?: string }> {
  let user;
  try {
    ({ user } = await requireAdmin());
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { data: sourceRaw, error: readError } = await supabase
    .from("newsletter_issues")
    .select("title, subject, preheader, content, target_interests, featured_blog_post_id, template_id")
    .eq("id", id)
    .single();

  if (readError || !sourceRaw) return { error: readError?.message ?? "Issue not found" };
  const source = sourceRaw as unknown as {
    title: string;
    subject: string;
    preheader: string;
    content: JSONContent;
    target_interests: string[];
    featured_blog_post_id: string | null;
    template_id: string | null;
  };

  const { data: row, error: insertError } = await supabase
    .from("newsletter_issues")
    .insert({
      title: `${source.title} (copy)`,
      subject: source.subject,
      preheader: source.preheader,
      content: source.content,
      target_interests: source.target_interests,
      featured_blog_post_id: source.featured_blog_post_id,
      template_id: source.template_id,
      author_id: user.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !row) return { error: insertError?.message ?? "Failed to duplicate" };

  revalidatePath("/admin/newsletter/issues");
  return { id: (row as { id: string }).id };
}

export async function deleteIssue(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("newsletter_issues")
    .delete()
    .eq("id", id)
    .in("status", ["draft", "pending_approval", "scheduled", "failed"]);

  if (error) return { error: error.message };

  revalidatePath("/admin/newsletter/issues");
  redirect("/admin/newsletter/issues");
}

// ─── Templates ────────────────────────────────────────────────────────────────

export interface TemplateInput {
  name: string;
  description?: string;
  content: JSONContent;
  is_default?: boolean;
}

export async function createTemplate(
  input: TemplateInput
): Promise<{ error?: string; id?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  if (!input.name?.trim()) return { error: "Name is required" };

  const supabase = createServiceClient();

  if (input.is_default) {
    await supabase
      .from("newsletter_templates")
      .update({ is_default: false })
      .eq("is_default", true);
  }

  const { data: row, error } = await supabase
    .from("newsletter_templates")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      content: input.content,
      is_default: input.is_default ?? false,
    })
    .select("id")
    .single();

  if (error || !row) return { error: error?.message ?? "Failed to create template" };

  revalidatePath("/admin/newsletter/templates");
  return { id: (row as { id: string }).id };
}

export async function updateTemplate(
  id: string,
  input: TemplateInput
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  if (!input.name?.trim()) return { error: "Name is required" };

  const supabase = createServiceClient();

  if (input.is_default) {
    await supabase
      .from("newsletter_templates")
      .update({ is_default: false })
      .neq("id", id)
      .eq("is_default", true);
  }

  const { error } = await supabase
    .from("newsletter_templates")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      content: input.content,
      is_default: input.is_default ?? false,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/admin/newsletter/templates/${id}`);
  revalidatePath("/admin/newsletter/templates");
  return {};
}

export async function deleteTemplate(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("newsletter_templates")
    .delete()
    .eq("id", id)
    .eq("is_default", false);

  if (error) return { error: error.message };

  revalidatePath("/admin/newsletter/templates");
  redirect("/admin/newsletter/templates");
}

// ─── Subscribers ──────────────────────────────────────────────────────────────

export async function manuallyUnsubscribe(subscriberId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { data: subRaw, error: readError } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", subscriberId)
    .select("email")
    .single();

  if (readError) return { error: readError.message };

  const sub = subRaw as { email: string } | null;
  if (sub?.email) {
    syncNewsletterSubscriber({ email: sub.email }).catch((err) =>
      console.error("[newsletter] GHL unsubscribe sync failed:", err)
    );
  }

  revalidatePath("/admin/newsletter/subscribers");
  return {};
}

// ─── Ideas inbox ──────────────────────────────────────────────────────────────

export async function saveIdea(body: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const trimmed = body.trim();
  if (!trimmed) return { error: "Idea cannot be empty" };

  const supabase = createServiceClient();
  const { error } = await supabase.from("newsletter_ideas").insert({ body: trimmed });
  if (error) return { error: error.message };

  revalidatePath("/admin/newsletter");
  return {};
}

export async function deleteIdea(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("newsletter_ideas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/newsletter");
  return {};
}
