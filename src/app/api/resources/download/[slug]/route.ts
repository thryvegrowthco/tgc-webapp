import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/resources/download/[slug]
// Public (free resources — no login). Looks up an enabled resource by slug,
// mints a short-lived signed URL for its hosted file (or uses its external
// link), counts the download, and redirects. Routing every download through
// here is what makes the download count accurate.
const RESOURCE_BUCKET = "resource-files";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const svc = createServiceClient();

  const { data: row } = await svc
    .from("resources")
    .select("id, enabled, file_path, file_name, external_url")
    .eq("slug", slug)
    .maybeSingle();

  const resource = row as {
    id: string;
    enabled: boolean;
    file_path: string | null;
    file_name: string | null;
    external_url: string | null;
  } | null;

  if (!resource || !resource.enabled) {
    return new Response("Not found", { status: 404 });
  }

  // Hosted file takes precedence over an external link.
  let target: string | null = null;
  if (resource.file_path) {
    const { data, error } = await svc.storage
      .from(RESOURCE_BUCKET)
      .createSignedUrl(resource.file_path, 600, { download: resource.file_name ?? true });
    if (!error && data?.signedUrl) target = data.signedUrl;
  } else if (resource.external_url) {
    target = resource.external_url;
  }

  if (!target) {
    return new Response("This resource isn't available for download yet.", { status: 404 });
  }

  // Best-effort tracking — must never block or fail the download.
  try {
    const ua = request.headers.get("user-agent")?.slice(0, 500) ?? null;
    await svc.from("resource_events").insert({
      resource_id: resource.id,
      event_type: "download",
      user_agent: ua,
    });
    await svc.rpc("increment_resource_download", { p_resource_id: resource.id });
  } catch {
    // swallow
  }

  return Response.redirect(target, 302);
}
