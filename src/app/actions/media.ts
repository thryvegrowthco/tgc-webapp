"use server";

// Media helpers shared by the blog + newsletter rich-text editors (MediaPicker).
// - uploadEditorImage: store a file in the PUBLIC `blog-images` bucket and return
//   its permanent public URL (email needs publicly reachable URLs — the private
//   `documents` bucket's signed URLs expire and won't render in an inbox).
// - trackUnsplashDownload: Unsplash API guideline — ping a photo's
//   download_location when the user actually picks it. Best-effort, never blocks.

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — keep email payloads sane

export async function uploadEditorImage(
  formData: FormData
): Promise<{ error?: string; url?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Unsupported file type. Use JPG, PNG, WebP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image is too large (max 10 MB)." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `inline/${Date.now()}-${safeName}`;

  const supabase = createServiceClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("blog-images")
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from("blog-images").getPublicUrl(storagePath);
  return { url: data.publicUrl };
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
