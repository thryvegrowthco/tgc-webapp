// Client helper: upload a file DIRECTLY to Supabase Storage via an admin signed
// URL (POST /api/admin/uploads/sign → PUT to the signed URL). This bypasses the
// Next.js Server Action body limit (1 MB) and Vercel's ~4.5 MB function request
// cap, so files up to the bucket limit (25 MB) upload reliably.
//
// Throws on failure — callers should wrap in try/catch/finally so the UI always
// clears its loading state and surfaces the error.

export type UploadBucket = "resource-files" | "blog-images";

export async function uploadViaSignedUrl(
  bucket: UploadBucket,
  file: File,
  prefix?: string
): Promise<{ path: string; publicUrl?: string }> {
  const signRes = await fetch("/api/admin/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, filename: file.name, sizeBytes: file.size, prefix }),
  });
  const signJson = await signRes.json();
  if (!signRes.ok) throw new Error(signJson.error ?? "Could not start the upload.");

  const putRes = await fetch(signJson.signedUrl as string, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!putRes.ok) {
    // Supabase returns 400 here when the file's type isn't in the bucket's
    // allowed_mime_types, or the size exceeds its limit.
    throw new Error("Upload failed — check the file type and size (max 25 MB).");
  }

  return { path: signJson.path as string, publicUrl: signJson.publicUrl as string | undefined };
}
