// Admin-only preview of a newsletter issue rendered to HTML. Used by the
// preview page iframe at /admin/newsletter/issues/[id]/preview.

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { renderIssueHTML } from "@/lib/email/newsletter-render";
import type { JSONContent } from "@tiptap/react";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const p = profile as { role: string } | null;
  if (p?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const service = createServiceClient();
  const { data: issueRaw, error } = await service
    .from("newsletter_issues")
    .select("subject, preheader, content")
    .eq("id", id)
    .single();

  if (error || !issueRaw) return new Response("Not found", { status: 404 });
  const issue = issueRaw as unknown as { subject: string; preheader: string; content: JSONContent };

  let html = renderIssueHTML({
    subject: issue.subject,
    preheader: issue.preheader,
    content: issue.content,
  });

  // Replace placeholders with preview-friendly values
  html = html
    .split("{{first_name}}").join("there")
    .split("{{unsubscribe_url}}").join("#preview-unsubscribe")
    .split("{{manage_url}}").join("#preview-manage");

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
