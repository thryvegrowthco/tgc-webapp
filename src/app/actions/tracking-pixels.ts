"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require";

export interface UpdateTrackingPixelInput {
  id: string;
  pixelId: string;
  enabled: boolean;
}

function bumpEverywhere(): void {
  // The root layout fetches enabled pixels, so any update has to bust the
  // layout cache to reach every page. /privacy also reads the same data for
  // the dynamic cookies disclosure, so bump it explicitly.
  revalidatePath("/", "layout");
  revalidatePath("/privacy");
  revalidatePath("/admin/integrations");
}

export async function toggleTrackingPixel(
  id: string,
  enabled: boolean
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tracking_pixels")
    .update({
      enabled,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  bumpEverywhere();
  return { success: true };
}

export async function updateTrackingPixel(
  input: UpdateTrackingPixelInput
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const pixelId = input.pixelId.trim();
  // Empty pixel ID is allowed (Rachel can clear a value), but enabling a row
  // with no ID would render a broken script. Catch that before it ships.
  if (input.enabled && !pixelId) {
    return { error: "Add a pixel ID before turning this on." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tracking_pixels")
    .update({
      pixel_id: pixelId.length > 0 ? pixelId : null,
      enabled: input.enabled,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };
  bumpEverywhere();
  return { success: true };
}
