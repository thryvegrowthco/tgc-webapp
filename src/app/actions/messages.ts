"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resend, FROM_EMAIL, REPLY_TO_EMAIL } from "@/lib/email/resend";
import { renderShell } from "@/lib/email/shell";
import { createClientNotification } from "@/lib/notifications/client";
import { createAdminNotification } from "@/lib/notifications/admin";
import { isNotificationDisabled } from "@/lib/notifications/settings";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@thryvegrowth.co";
const MAX_BODY_LEN = 5000;

interface SendArgs {
  /** When admin posts, this identifies which client thread. Ignored if sender is the client. */
  clientId?: string;
  body: string;
  /** Storage path of an attachment uploaded via uploadMessageAttachment. */
  attachmentPath?: string;
}

export async function sendMessage(args: SendArgs): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };

  const body = args.body.trim();
  const attachmentPath = args.attachmentPath?.trim() || null;
  if (!body && !attachmentPath) return { error: "Message can't be empty." };
  if (body.length > MAX_BODY_LEN) return { error: "Message is too long." };

  // Determine sender role + clientId
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();
  const me = profile as { role: string; full_name: string | null; email: string } | null;
  const isAdmin = me?.role === "admin";

  let clientId: string;
  if (isAdmin) {
    if (!args.clientId) return { error: "Choose a client thread first." };
    clientId = args.clientId;
  } else {
    clientId = user.id;
  }

  const senderRole: "admin" | "client" = isAdmin ? "admin" : "client";

  const { error: insertError } = await supabase.from("client_messages").insert({
    client_id: clientId,
    sender_id: user.id,
    sender_role: senderRole,
    body,
    attachment_path: attachmentPath,
  });

  if (insertError) return { error: insertError.message };

  const notifyBody = body || "📎 Sent an attachment";

  // Fire an email notification to the other party
  try {
    if (senderRole === "client") {
      const senderName = me?.full_name || me?.email?.split("@")[0] || "A client";
      if (!(await isNotificationDisabled("admin_email:client_message"))) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `New message from ${senderName}`,
          html: renderShell(buildNotifyHtml({
            headline: `New message from ${senderName}`,
            body: notifyBody,
            ctaUrl: `${APP_URL}/admin/messages/${clientId}`,
            ctaLabel: "Reply in admin",
          })),
        });
      }
      // In-app bell for the admin (email above already sent).
      await createAdminNotification({
        type: "client_message",
        title: `New message from ${senderName}`,
        body: notifyBody.length > 90 ? `${notifyBody.slice(0, 90)}…` : notifyBody,
        link: `/admin/messages/${clientId}`,
        clientId,
      });
    } else {
      // Look up the client's email
      const service = createServiceClient();
      const { data: target } = await service
        .from("profiles")
        .select("full_name, email")
        .eq("id", clientId)
        .single();
      if (target?.email && !(await isNotificationDisabled("client_email:message_received"))) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: target.email,
          replyTo: REPLY_TO_EMAIL,
          subject: "New message from Rachel",
          html: renderShell(buildNotifyHtml({
            headline: `New message from Rachel`,
            body: notifyBody,
            ctaUrl: `${APP_URL}/dashboard/messages`,
            ctaLabel: "Open conversation",
          })),
        });
      }
      // In-app bell notification for the client.
      await createClientNotification({
        clientId,
        type: "message_received",
        title: "New message from Rachel",
        body: notifyBody.length > 90 ? `${notifyBody.slice(0, 90)}…` : notifyBody,
        link: "/dashboard/messages",
      });
    }
  } catch {
    // Notification failures don't block the message.
  }

  revalidatePath("/dashboard/messages");
  revalidatePath("/admin/messages");
  if (isAdmin) revalidatePath(`/admin/messages/${clientId}`);
  return { success: true };
}

export async function markThreadRead(clientId: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = (profile as { role: string } | null)?.role === "admin";

  // Clients can only mark their own thread; admins can mark any.
  if (!isAdmin && clientId !== user.id) return { error: "Unauthorized" };

  // Mark messages FROM the other side as read.
  const otherRole: "admin" | "client" = isAdmin ? "client" : "admin";

  await supabase
    .from("client_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("sender_role", otherRole)
    .is("read_at", null);

  revalidatePath("/dashboard/messages");
  revalidatePath("/admin/messages");
  if (isAdmin) revalidatePath(`/admin/messages/${clientId}`);
  return { success: true };
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB (matches documents bucket)

// Uploads a message attachment to the private `documents` bucket under
// `messages/{clientId}/{ts}-{name}` via the service client. Client uploads land
// in their own folder; admin must pass the target clientId. Download is gated by
// /api/messages/attachment.
export async function uploadMessageAttachment(
  formData: FormData
): Promise<{ path?: string; filename?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file selected." };
  if (file.size > MAX_ATTACHMENT_BYTES) return { error: "File too large (max 25 MB)." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = (profile as { role: string } | null)?.role === "admin";

  let clientId: string;
  if (isAdmin) {
    const passed = formData.get("clientId");
    if (typeof passed !== "string" || !passed) return { error: "Choose a client thread first." };
    clientId = passed;
  } else {
    clientId = user.id;
  }

  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(-120);
  const path = `messages/${clientId}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const service = createServiceClient();
  const { error } = await service.storage
    .from("documents")
    .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) return { error: error.message };

  return { path, filename: safeName };
}

function buildNotifyHtml(args: {
  headline: string;
  body: string;
  ctaUrl: string;
  ctaLabel: string;
}): string {
  return `<p style="margin:0 0 12px;font-weight:600;font-size:16px;">${escapeHtml(args.headline)}</p>
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 16px;white-space:pre-wrap;color:#0f172a;">${escapeHtml(args.body)}</div>
<p style="margin:0 0 24px;text-align:center;"><a href="${args.ctaUrl}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;">${escapeHtml(args.ctaLabel)}</a></p>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
