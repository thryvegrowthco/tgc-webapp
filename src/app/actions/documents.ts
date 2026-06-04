"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTemplated } from "@/lib/email/render";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

type DocumentCategory =
  | "resume"
  | "cover_letter"
  | "notes"
  | "worksheet"
  | "template"
  | "deliverable"
  | "resume_rewrite"
  | "hr_doc"
  | "other";

const DELIVERABLE_CATEGORIES: ReadonlySet<DocumentCategory> = new Set([
  "deliverable",
  "resume_rewrite",
  "hr_doc",
]);

const DELIVERABLE_LABELS: Record<string, string> = {
  deliverable: "deliverable",
  resume_rewrite: "resume rewrite",
  hr_doc: "HR document",
};

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

  const categoryValue: DocumentCategory | null =
    category && isDocumentCategory(category) ? category : null;

  // Insert document record
  const { data: inserted, error: dbError } = await serviceClient
    .from("documents")
    .insert({
      client_id: clientId,
      uploaded_by: user.id,
      filename: file.name,
      storage_path: storagePath,
      file_size_bytes: file.size,
      category: categoryValue,
      description: description || null,
    })
    .select("id")
    .single();

  if (dbError || !inserted) {
    // Clean up storage on db failure
    await serviceClient.storage.from("documents").remove([storagePath]);
    console.error("[uploadDocument] DB error:", dbError);
    return { error: dbError?.message ?? "Failed to record document." };
  }

  // When the category signals a finished deliverable, notify the client.
  // Idempotency is handled by sendTemplated's automation_log — the event_key
  // embeds the document id so each unique upload sends exactly once even if
  // the action is retried.
  if (categoryValue && DELIVERABLE_CATEGORIES.has(categoryValue)) {
    await notifyDeliverableReady({
      documentId: inserted.id,
      clientId,
      category: categoryValue,
      filename: file.name,
    });
  }

  return { success: true };
}

function isDocumentCategory(value: string): value is DocumentCategory {
  return (
    value === "resume" ||
    value === "cover_letter" ||
    value === "notes" ||
    value === "worksheet" ||
    value === "template" ||
    value === "deliverable" ||
    value === "resume_rewrite" ||
    value === "hr_doc" ||
    value === "other"
  );
}

async function notifyDeliverableReady(args: {
  documentId: string;
  clientId: string;
  category: DocumentCategory;
  filename: string;
}): Promise<void> {
  const service = createServiceClient();
  const { data: client } = await service
    .from("profiles")
    .select("full_name, email")
    .eq("id", args.clientId)
    .single();

  if (!client?.email) return;

  const clientName = client.full_name || client.email.split("@")[0] || "there";
  const deliverableType = DELIVERABLE_LABELS[args.category] ?? "deliverable";

  // Per-document idempotency. `sendTemplated`'s built-in dedupe only fires when
  // a bookingId is supplied (the UNIQUE index on automation_log is partial on
  // booking_id IS NOT NULL), so for the deliverable path we pre-check the log
  // by the document-scoped event_key ourselves before sending.
  const eventKey = `deliverable_ready_sent:${args.documentId}`;
  const { data: existing } = await service
    .from("automation_log")
    .select("id")
    .eq("event_key", eventKey)
    .eq("status", "success")
    .maybeSingle();
  if (existing) return;

  await sendTemplated("deliverable_ready", {
    to: client.email,
    clientId: args.clientId,
    eventKey,
    data: {
      client_name: clientName,
      deliverable_type: deliverableType,
      deliverable_url: `${APP_URL}/dashboard/documents`,
    },
  });
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
