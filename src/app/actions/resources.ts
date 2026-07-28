"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require";
import type { ResourceCtaType } from "@/types/database";

const CATEGORIES = new Set([
  "Career & Job Search",
  "Leadership & Coaching",
  "HR & Team Operations",
]);

const CTA_TYPES = new Set<ResourceCtaType>(["Buy Now", "Download"]);

const RESOURCE_BUCKET = "resource-files";
const MAX_RESOURCE_BYTES = 25 * 1024 * 1024; // 25 MB — matches the bucket limit
const ALLOWED_RESOURCE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "application/zip",
  "image/png",
  "image/jpeg",
]);

export interface UpdateResourceInput {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  ctaType: ResourceCtaType;
  sortOrder: number;
  enabled: boolean;
  externalUrl: string;
}

function bumpBoth(): void {
  // The public /resources page and the admin index both consume the same data;
  // a single update needs to bust both.
  revalidatePath("/resources");
  revalidatePath("/admin/resources");
}

export async function toggleResource(
  id: string,
  enabled: boolean
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("resources")
    .update({ enabled, updated_at: new Date().toISOString(), updated_by: auth.userId })
    .eq("id", id);

  if (error) return { error: error.message };
  bumpBoth();
  return { success: true };
}

export async function updateResource(
  input: UpdateResourceInput
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const title = input.title.trim();
  const description = input.description.trim();
  const category = input.category.trim();
  const price = input.price.trim();

  if (!title) return { error: "Title is required." };
  if (!description) return { error: "Description is required." };
  if (!price) return { error: "Price is required (use 'Free' for free downloads)." };
  if (!CATEGORIES.has(category)) return { error: "Pick a valid category." };
  if (!CTA_TYPES.has(input.ctaType)) return { error: "CTA type must be 'Buy Now' or 'Download'." };

  const externalUrl = input.externalUrl.trim();
  if (externalUrl && !/^https?:\/\//i.test(externalUrl)) {
    return { error: "External link must start with http:// or https://" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resources")
    .update({
      title,
      description,
      category,
      price,
      cta_type: input.ctaType,
      sort_order: Number.isFinite(input.sortOrder) ? Math.floor(input.sortOrder) : 0,
      enabled: input.enabled,
      external_url: externalUrl || null,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };
  bumpBoth();
  return { success: true };
}

// Upload a downloadable file for a resource → private `resource-files` bucket.
// A hosted file takes precedence over an external link in the download route.
export async function uploadResourceFile(
  id: string,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (file.size > MAX_RESOURCE_BYTES) return { error: "File is too large (max 25 MB)." };
  if (!ALLOWED_RESOURCE_TYPES.has(file.type)) {
    return { error: "Unsupported file type (PDF, Office docs, CSV, ZIP, PNG, or JPG)." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${id}/${Date.now()}-${safeName}`;
  const svc = createServiceClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error: upErr } = await svc.storage
    .from(RESOURCE_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });
  if (upErr) return { error: upErr.message };

  const { error } = await svc
    .from("resources")
    .update({
      file_path: storagePath,
      file_name: file.name,
      file_size_bytes: file.size,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  bumpBoth();
  return { success: true };
}

// Remove a resource's hosted file (clears the columns + deletes the object).
export async function removeResourceFile(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("resources")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();
  const filePath = (row as { file_path: string | null } | null)?.file_path;

  if (filePath) {
    // Best-effort object cleanup — don't block clearing the row if it fails.
    await svc.storage.from(RESOURCE_BUCKET).remove([filePath]);
  }

  const { error } = await svc
    .from("resources")
    .update({
      file_path: null,
      file_name: null,
      file_size_bytes: null,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  bumpBoth();
  return { success: true };
}
