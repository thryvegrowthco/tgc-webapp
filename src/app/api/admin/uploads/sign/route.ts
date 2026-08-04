// Admin-only signed upload URLs so the browser uploads files DIRECTLY to
// Supabase Storage, bypassing the Next.js Server Action body limit (1 MB) and
// Vercel's ~4.5 MB function request cap. Used by the resource editor (private
// `resource-files`) and the blog/newsletter MediaPicker (public `blog-images`).
//
// Mirrors src/app/api/uploads/sign/route.ts (the client-facing intake variant),
// but admin-gated and bucket-parameterized.

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // matches both bucket file_size_limits
const ALLOWED_BUCKETS = new Set(["resource-files", "blog-images"]);
const PUBLIC_BUCKETS = new Set(["blog-images"]);

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

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bucket?: string; filename?: string; sizeBytes?: number; prefix?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bucket = body.bucket ?? "";
  const filename = body.filename ?? "";
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return Response.json({ error: "Invalid bucket" }, { status: 400 });
  }
  if (!filename) {
    return Response.json({ error: "filename is required" }, { status: 400 });
  }
  if (typeof body.sizeBytes === "number" && body.sizeBytes > MAX_BYTES) {
    return Response.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  }

  const safeName = filename.replace(/[^\w.\-]/g, "_").slice(-120);
  const prefix = (body.prefix ?? "").replace(/[^\w\-]/g, "").slice(0, 64);
  const path = `${prefix ? `${prefix}/` : ""}${Date.now()}-${safeName}`;

  const svc = createServiceClient();
  const { data: signed, error } = await svc.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !signed) {
    return Response.json({ error: error?.message ?? "Failed to sign upload URL" }, { status: 500 });
  }

  const result: { path: string; token: string; signedUrl: string; publicUrl?: string } = {
    path: signed.path,
    token: signed.token,
    signedUrl: signed.signedUrl,
  };
  if (PUBLIC_BUCKETS.has(bucket)) {
    result.publicUrl = svc.storage.from(bucket).getPublicUrl(signed.path).data.publicUrl;
  }
  return Response.json(result);
}
