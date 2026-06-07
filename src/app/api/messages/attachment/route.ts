// Secure download for message attachments stored in the private `documents`
// bucket under `messages/{clientId}/...`. Admins can fetch any; a client can
// fetch only attachments in their own thread folder.

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const name = searchParams.get("name") ?? "attachment";
  if (!path || !path.startsWith("messages/")) return new Response("Bad request", { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = (profile as { role: string } | null)?.role === "admin";

  // Client may only read their own thread folder: messages/{user.id}/...
  if (!isAdmin && !path.startsWith(`messages/${user.id}/`)) {
    return new Response("Forbidden", { status: 403 });
  }

  const service = createServiceClient();
  const { data: signed, error } = await service.storage
    .from("documents")
    .createSignedUrl(path, 3600, { download: name });
  if (error || !signed) return new Response("Not found", { status: 404 });

  return Response.redirect(signed.signedUrl, 302);
}
