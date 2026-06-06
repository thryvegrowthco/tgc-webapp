"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require";
import type { ResourceCtaType } from "@/types/database";

const CATEGORIES = new Set([
  "Career & Job Search",
  "Leadership & Coaching",
  "HR & Team Operations",
]);

const CTA_TYPES = new Set<ResourceCtaType>(["Buy Now", "Download"]);

export interface UpdateResourceInput {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  ctaType: ResourceCtaType;
  sortOrder: number;
  enabled: boolean;
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
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };
  bumpBoth();
  return { success: true };
}
