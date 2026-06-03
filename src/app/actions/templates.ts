"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_TEMPLATES } from "@/lib/email/defaults";
import type { EmailTemplateKey } from "@/types/database";

const TEMPLATE_KEYS: EmailTemplateKey[] = [
  "receipt",
  "welcome",
  "intake_reminder_48h",
  "intake_reminder_24h",
  "intake_complete",
  "session_reminder_24h",
  "post_service_followup",
  "deliverable_ready",
];

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if ((profile as { role: string } | null)?.role !== "admin") {
    return { error: "Unauthorized" };
  }
  return { userId: user.id };
}

export async function updateEmailTemplate(input: {
  key: string;
  subject: string;
  bodyHtml: string;
}): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if ("error" in auth) return auth;

  if (!TEMPLATE_KEYS.includes(input.key as EmailTemplateKey)) {
    return { error: "Unknown template key." };
  }

  const subject = input.subject.trim();
  const bodyHtml = input.bodyHtml.trim();
  if (!subject) return { error: "Subject cannot be empty." };
  if (!bodyHtml) return { error: "Body cannot be empty." };

  const service = createServiceClient();
  const { error } = await service
    .from("email_templates")
    .update({
      subject,
      body_html: bodyHtml,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("key", input.key);

  if (error) return { error: error.message };

  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${input.key}`);
  return { success: true };
}

export async function resetEmailTemplate(key: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if ("error" in auth) return auth;

  const fallback = DEFAULT_TEMPLATES[key as EmailTemplateKey];
  if (!fallback) return { error: "Unknown template key." };

  const service = createServiceClient();
  const { error } = await service
    .from("email_templates")
    .update({
      subject: fallback.subject,
      body_html: fallback.bodyHtml,
      placeholders: fallback.placeholders,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("key", key);

  if (error) return { error: error.message };

  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${key}`);
  return { success: true };
}
