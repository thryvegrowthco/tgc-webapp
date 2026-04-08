"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function uploadDocument(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const clientId = formData.get("clientId") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string | null;
  const file = formData.get("file") as File | null;

  if (!clientId || !file || file.size === 0) {
    return { error: "Client and file are required." };
  }

  // Build storage path: {clientId}/{timestamp}-{sanitized filename}
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${clientId}/${Date.now()}-${safeName}`;

  // Use service client for storage upload (bypasses RLS on the upload side)
  const serviceClient = createServiceClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await serviceClient.storage
    .from("documents")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[uploadDocument] Storage error:", uploadError);
    return { error: uploadError.message };
  }

  // Insert document record
  const { error: dbError } = await serviceClient.from("documents").insert({
    client_id: clientId,
    uploaded_by: user.id,
    filename: file.name,
    storage_path: storagePath,
    file_size_bytes: file.size,
    category: category as "resume" | "cover_letter" | "notes" | "worksheet" | "template" | "other" | null || null,
    description: description || null,
  });

  if (dbError) {
    // Clean up storage on db failure
    await serviceClient.storage.from("documents").remove([storagePath]);
    console.error("[uploadDocument] DB error:", dbError);
    return { error: dbError.message };
  }

  return { success: true };
}

export async function deleteDocument(
  documentId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const serviceClient = createServiceClient();

  // Get the storage path before deletion
  const { data: doc } = await serviceClient
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (!doc) return { error: "Document not found" };

  // Delete from storage
  await serviceClient.storage.from("documents").remove([doc.storage_path]);

  // Delete DB record
  const { error } = await serviceClient.from("documents").delete().eq("id", documentId);
  if (error) return { error: error.message };

  return {};
}

export async function addClientNote(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const clientId = formData.get("clientId") as string;
  const note = formData.get("note") as string;
  const sessionDate = formData.get("sessionDate") as string | null;

  if (!clientId || !note?.trim()) {
    return { error: "Client ID and note are required." };
  }

  const { error } = await supabase.from("admin_client_notes").insert({
    client_id: clientId,
    note: note.trim(),
    session_date: sessionDate || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
