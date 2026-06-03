// Issues a Supabase Storage signed upload URL for the `client-uploads`
// bucket. Clients call this from the intake form (and the dashboard documents
// page in Phase 4) to upload a file directly to Storage, bypassing the Next.js
// server for the file payload.
//
// Path convention: `{userId}/{bookingId}/{timestamp}-{sanitizedFilename}`
// This lets admin UI group uploads by booking, and matches the RLS policy
// in migration 0010.

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB matches the bucket file_size_limit

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bookingId?: string; filename?: string; sizeBytes?: number; fieldId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { bookingId, filename, sizeBytes } = body;
  if (!bookingId || !filename) {
    return Response.json({ error: "bookingId and filename are required" }, { status: 400 });
  }

  if (typeof sizeBytes === "number" && sizeBytes > MAX_BYTES) {
    return Response.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  }

  // Validate booking ownership
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, client_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.client_id !== user.id) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  // Build a safe storage path: {userId}/{bookingId}/{timestamp}-{sanitized}
  const safeName = filename.replace(/[^\w.\-]/g, "_").slice(-120);
  const path = `${user.id}/${bookingId}/${Date.now()}-${safeName}`;

  const { data: signed, error } = await supabase.storage
    .from("client-uploads")
    .createSignedUploadUrl(path);

  if (error || !signed) {
    return Response.json({ error: error?.message ?? "Failed to sign upload URL" }, { status: 500 });
  }

  return Response.json({
    path: signed.path,
    token: signed.token,
    signedUrl: signed.signedUrl,
  });
}
