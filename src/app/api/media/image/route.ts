// Unsplash search proxy — keeps UNSPLASH_ACCESS_KEY server-side and normalizes
// the response for the MediaPicker. Admin-only. Degrades gracefully: with no key
// it returns { configured: false, items: [] }.
//
// Unsplash guidelines honored: photographer credit is returned (and shown in the
// picker); the picked photo's download_location is pinged via the
// trackUnsplashDownload action; image URLs are hotlinked (their CDN), not rehosted.

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

type UnsplashPhoto = {
  id: string;
  alt_description?: string | null;
  description?: string | null;
  urls?: { regular?: string; small?: string; thumb?: string };
  links?: { download_location?: string };
  user?: { name?: string; links?: { html?: string } };
};

const UTM = "?utm_source=thryve_growth_co&utm_medium=referral";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return NextResponse.json({ configured: false, items: [] });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  // Unsplash has no "trending search" — default to a pleasant evergreen query.
  const query = q || "workspace";
  const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=24&page=${page}&content_filter=high&orientation=landscape`;

  try {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ configured: true, items: [], error: "Search failed" }, { status: 502 });
    }
    const json = (await res.json()) as { results?: UnsplashPhoto[] };
    const items = (json.results ?? [])
      .map((p) => {
        const src = p.urls?.regular;
        const thumb = p.urls?.small ?? p.urls?.thumb ?? src;
        if (!src) return null;
        const creditName = p.user?.name ?? "Unsplash";
        const creditLink = p.user?.links?.html ? `${p.user.links.html}${UTM}` : `https://unsplash.com${UTM}`;
        const baseAlt = (p.alt_description ?? p.description ?? "Photo").trim();
        return {
          id: p.id,
          src,
          thumb,
          // Attribution carried in the alt text of the inserted image.
          alt: `${baseAlt} — Photo by ${creditName} on Unsplash`,
          creditName,
          creditLink,
          downloadLocation: p.links?.download_location ?? "",
        };
      })
      .filter(Boolean);
    return NextResponse.json({ configured: true, items });
  } catch {
    return NextResponse.json({ configured: true, items: [], error: "Search failed" }, { status: 502 });
  }
}
