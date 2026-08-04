"use server";

// Media helper for the blog + newsletter rich-text editors (MediaPicker).
// File uploads now go straight to Storage via POST /api/admin/uploads/sign
// (no Server Action body limit); this file only keeps the Unsplash ping.
//
// trackUnsplashDownload: Unsplash API guideline — ping a photo's
// download_location when the user actually picks it. Best-effort, never blocks.

import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if ((profile as { role?: string } | null)?.role !== "admin") throw new Error("Unauthorized");
}

export async function trackUnsplashDownload(
  downloadLocation: string
): Promise<{ ok: boolean }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false };
  }
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !downloadLocation.startsWith("https://api.unsplash.com/")) {
    return { ok: false };
  }
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${key}` },
      // Don't cache — this is an event ping, not data.
      cache: "no-store",
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
