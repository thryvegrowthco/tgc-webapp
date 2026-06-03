import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TemplateEditor } from "@/components/admin/TemplateEditor";
import { renderShell } from "@/lib/email/shell";
import { DEFAULT_TEMPLATES } from "@/lib/email/defaults";
import type { EmailTemplateKey } from "@/types/database";

export const metadata: Metadata = {
  title: "Edit Template — Admin",
  robots: { index: false, follow: false },
};

const SAMPLE_DATA: Record<string, string> = {
  client_name: "Jane",
  service_type: "Career & Leadership Coaching: Single Session",
  amount_formatted: "$125.00",
  payment_date: "June 14, 2026",
  transaction_id: "pi_3O8YzL1nLkP9mz0G1abc23x4",
  intake_due_date: "Monday, June 16, 2026",
  session_workspace_url: "https://thryvegrowth.co/dashboard/sessions/sample",
  session_date: "Tuesday, June 17, 2026",
  session_time: "2:00 PM",
  meet_link: "https://meet.google.com/abc-defg-hij",
  testimonial_url: "https://thryvegrowth.co/testimonial",
  book_url: "https://thryvegrowth.co/book",
  deliverable_type: "Resume Rewrite",
  deliverable_url: "https://thryvegrowth.co/dashboard/documents",
};

const SHELL_BODY_TOKEN = "__BODY__";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/admin/templates/${key}`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const me = profile as { role: string } | null;
  if (me?.role !== "admin") redirect("/dashboard");

  if (!(key in DEFAULT_TEMPLATES)) {
    notFound();
  }

  const { data: template } = await supabase
    .from("email_templates")
    .select("subject, body_html, placeholders, updated_at")
    .eq("key", key)
    .maybeSingle();

  const fallback = DEFAULT_TEMPLATES[key as EmailTemplateKey];

  const subject = template?.subject ?? fallback.subject;
  const bodyHtml = template?.body_html ?? fallback.bodyHtml;
  const placeholders = template?.placeholders ?? fallback.placeholders;

  // Build the shell with a placeholder for the body so the editor can swap
  // the live HTML in client-side.
  const shellTemplate = renderShell(SHELL_BODY_TOKEN);

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/templates"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> All templates
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">{prettyKey(key)}</h1>
        {template?.updated_at && (
          <p className="text-xs text-neutral-500 mt-1">
            Last updated {new Date(template.updated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </div>

      <TemplateEditor
        templateKey={key}
        initialSubject={subject}
        initialBodyHtml={bodyHtml}
        placeholders={placeholders}
        sampleData={SAMPLE_DATA}
        shellTemplate={shellTemplate}
      />
    </div>
  );
}

function prettyKey(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
