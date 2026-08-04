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

// Record a file that the browser already uploaded directly to the private
// `resource-files` bucket (via POST /api/admin/uploads/sign → PUT). The file
// never passes through a Server Action, so there's no 1 MB / 4.5 MB body cap.
export async function finalizeResourceFile(
  id: string,
  file: { path: string; fileName: string; sizeBytes: number }
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  if (!file?.path) return { error: "No uploaded file to record." };

  const svc = createServiceClient();
  const { error } = await svc
    .from("resources")
    .update({
      file_path: file.path,
      file_name: file.fileName,
      file_size_bytes: file.sizeBytes,
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

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "resource"
  );
}

export interface CreateResourceInput {
  title: string;
  description: string;
  category: string;
  price: string;
  ctaType: ResourceCtaType;
}

// Create a new catalog resource. Starts hidden (enabled=false) so Rachel can add
// a file/link and review before it shows on /resources.
export async function createResource(
  input: CreateResourceInput
): Promise<{ error?: string; id?: string }> {
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

  const supabase = await createClient();

  // Unique slug: base, then base-2, base-3, … (mirrors blog slug handling).
  const base = slugify(title);
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { data: existing } = await supabase.from("resources").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${base}-${n}`;
  }

  // New resources sort to the end of the list.
  const { data: maxRow } = await supabase
    .from("resources")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 10;

  const { data: inserted, error } = await supabase
    .from("resources")
    .insert({
      slug,
      title,
      description,
      category,
      price,
      cta_type: input.ctaType,
      enabled: false,
      sort_order: sortOrder,
      updated_by: auth.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  bumpBoth();
  return { id: (inserted as { id: string }).id };
}

// Permanently delete a resource (and its hosted file, best-effort).
export async function deleteResource(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const svc = createServiceClient();
  const { data: row } = await svc.from("resources").select("file_path").eq("id", id).maybeSingle();
  const filePath = (row as { file_path: string | null } | null)?.file_path;
  if (filePath) {
    await svc.storage.from(RESOURCE_BUCKET).remove([filePath]);
  }

  const { error } = await svc.from("resources").delete().eq("id", id);
  if (error) return { error: error.message };

  bumpBoth();
  return { success: true };
}
