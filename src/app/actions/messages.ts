"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resend, FROM_EMAIL } from "@/lib/email/resend";
import { renderShell } from "@/lib/email/shell";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@thryvegrowth.co";
const MAX_BODY_LEN = 5000;

interface SendArgs {
  /** When admin posts, this identifies which client thread. Ignored if sender is the client. */
  clientId?: string;
  body: string;
}

export async function sendMessage(args: SendArgs): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };

  const body = args.body.trim();
  if (!body) return { error: "Message can't be empty." };
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
  });

  if (insertError) return { error: insertError.message };

  // Fire an email notification to the other party
  try {
    if (senderRole === "client") {
      const senderName = me?.full_name || me?.email?.split("@")[0] || "A client";
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `New message from ${senderName}`,
        html: renderShell(buildNotifyHtml({
          headline: `New message from ${senderName}`,
          body,
          ctaUrl: `${APP_URL}/admin/messages/${clientId}`,
          ctaLabel: "Reply in admin",
        })),
      });
    } else {
      // Look up the client's email
      const service = createServiceClient();
      const { data: target } = await service
        .from("profiles")
        .select("full_name, email")
        .eq("id", clientId)
        .single();
      if (target?.email) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: target.email,
          subject: "New message from Rachel",
          html: renderShell(buildNotifyHtml({
            headline: `New message from Rachel`,
            body,
            ctaUrl: `${APP_URL}/dashboard/messages`,
            ctaLabel: "Open conversation",
          })),
        });
      }
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
