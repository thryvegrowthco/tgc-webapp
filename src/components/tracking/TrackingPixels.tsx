// Async server shell that fetches enabled tracking pixels and hands the array
// to the client-side consent gate. Anonymous read RLS on tracking_pixels
// (defined in 0015_tracking_pixels.sql) ensures only rows with enabled=true
// AND a non-empty pixel_id are returned — so we never accidentally surface
// draft state to the public layout.
//
// Failures degrade silently: if Supabase is unreachable or the table doesn't
// exist yet (e.g., before the 0015 migration applies), we just render nothing
// rather than crashing the entire root layout.

import { createClient } from "@/lib/supabase/server";
import type { TrackingPixel } from "@/types/database";
import { TrackingScripts } from "./TrackingScripts";

export async function TrackingPixels() {
  let pixels: TrackingPixel[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tracking_pixels")
      .select("id, provider, name, description, id_placeholder, pixel_id, enabled, sort_order, updated_at, updated_by, created_at")
      .eq("enabled", true)
      .not("pixel_id", "is", null)
      .order("sort_order", { ascending: true });
    pixels = (data ?? []) as TrackingPixel[];
  } catch {
    // Migration not yet applied, or Supabase unreachable — fail open with no
    // scripts. Better than 500-ing every page in the site.
    pixels = [];
  }

  if (pixels.length === 0) return null;
  return <TrackingScripts pixels={pixels} />;
}
