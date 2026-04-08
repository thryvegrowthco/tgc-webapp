import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/documents/download?path=<storage_path>&name=<filename>
// Returns a short-lived signed URL for the requested document.
// Authorization: the user must own the document (enforced by checking the
// documents table via RLS, not just the path).
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const storagePath = request.nextUrl.searchParams.get("path");
  const filename = request.nextUrl.searchParams.get("name") ?? "download";

  if (!storagePath) {
    return new Response("Missing path param", { status: 400 });
  }

  // Verify user owns this document (or is admin) via the documents table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("storage_path", storagePath)
      .eq("client_id", user.id)
      .maybeSingle();

    if (!doc) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Create a 60-minute signed URL
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600, {
      download: filename,
    });

  if (error || !data?.signedUrl) {
    console.error("[documents/download]", error);
    return new Response("Failed to generate download link", { status: 500 });
  }

  return Response.redirect(data.signedUrl, 302);
}
