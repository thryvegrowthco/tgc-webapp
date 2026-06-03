// Send a single test copy of a draft newsletter to an arbitrary email
// (typically Rachel's own). Doesn't write to newsletter_sends and doesn't
// count toward sent_count.

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resend, FROM_EMAIL } from "@/lib/email/resend";
import { renderIssueHTML, renderIssueText } from "@/lib/email/newsletter-render";
import type { JSONContent } from "@tiptap/react";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const p = profile as { role: string } | null;
  if (p?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { issueId, email } = (body ?? {}) as { issueId?: unknown; email?: unknown };
  if (typeof issueId !== "string" || typeof email !== "string") {
    return NextResponse.json({ error: "issueId and email are required" }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: issueRaw, error } = await service
    .from("newsletter_issues")
    .select("subject, preheader, content")
    .eq("id", issueId)
    .single();

  if (error || !issueRaw) return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  const issue = issueRaw as unknown as { subject: string; preheader: string; content: JSONContent };

  const placeholders = {
    first_name: "Rachel",
    unsubscribe_url: "https://thryvegrowth.co/newsletter/unsubscribe/test",
    manage_url: "https://thryvegrowth.co/newsletter/manage/test",
  };

  const html = personalize(renderIssueHTML({
    subject: issue.subject,
    preheader: issue.preheader,
    content: issue.content,
  }), placeholders);

  const text = personalize(renderIssueText({
    subject: issue.subject,
    preheader: issue.preheader,
    content: issue.content,
  }), placeholders);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `[Test] ${issue.subject || "Newsletter preview"}`,
      html,
      text,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}

function personalize(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}
