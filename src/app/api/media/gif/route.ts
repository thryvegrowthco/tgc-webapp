// Giphy search proxy — keeps GIPHY_API_KEY server-side and normalizes the
// response for the MediaPicker. Admin-only (only admins compose content).
// Degrades gracefully: with no key set it returns { configured: false, items: [] }
// so the picker can show a "not set up yet" state instead of erroring.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return (profile as { role?: string } | null)?.role === "admin";
}

type GiphyImage = { url?: string };
type GiphyItem = {
  id: string;
  title?: string;
  images?: {
    downsized_medium?: GiphyImage;
    original?: GiphyImage;
    fixed_width_small?: GiphyImage;
    fixed_height_small?: GiphyImage;
  };
};

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.GIPHY_API_KEY;
  if (!key) {
    return NextResponse.json({ configured: false, items: [] });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  const endpoint = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=24&offset=${offset}&rating=pg-13&bundle=messaging_non_clips`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=24&offset=${offset}&rating=pg-13&bundle=messaging_non_clips`;

  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ configured: true, items: [], error: "Search failed" }, { status: 502 });
    }
    const json = (await res.json()) as { data?: GiphyItem[] };
    const items = (json.data ?? [])
      .map((g) => {
        const src = g.images?.downsized_medium?.url ?? g.images?.original?.url;
        const thumb = g.images?.fixed_width_small?.url ?? g.images?.fixed_height_small?.url ?? src;
        if (!src) return null;
        return { id: g.id, src, thumb, alt: g.title?.trim() || "GIF" };
      })
      .filter(Boolean);
    return NextResponse.json({ configured: true, items });
  } catch {
    return NextResponse.json({ configured: true, items: [], error: "Search failed" }, { status: 502 });
  }
}
