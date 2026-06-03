import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Email Templates — Admin",
  robots: { index: false, follow: false },
};

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  receipt: "Sent immediately after Stripe checkout. Receipt + transaction details.",
  welcome: "Sent right after the receipt. Warm welcome + next steps + intake link.",
  intake_reminder_48h: "Sent 48 hours before the session if intake not yet submitted.",
  intake_reminder_24h: "Sent 24 hours before the session if intake not yet submitted.",
  intake_complete: "Sent immediately after the client submits the intake form.",
  session_reminder_24h: "Sent 24 hours before the session. Includes the meeting link.",
  post_service_followup: "Sent 24 hours after the session is marked complete.",
  deliverable_ready: "Sent manually when a deliverable (resume rewrite, etc.) is ready.",
};

type TemplateRow = {
  key: string;
  subject: string;
  updated_at: string;
};

export default async function AdminTemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/templates");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const me = profile as { role: string } | null;
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: templatesRaw } = await supabase
    .from("email_templates")
    .select("key, subject, updated_at")
    .order("key", { ascending: true });

  const templates = (templatesRaw ?? []) as TemplateRow[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Email Templates</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Edit the copy of every automated email. Changes apply to all future sends.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
        {templates.map((t) => (
          <Link
            key={t.key}
            href={`/admin/templates/${t.key}`}
            className="flex items-center justify-between gap-4 p-5 hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 bg-brand-50 rounded-lg flex-shrink-0">
                <Mail className="h-4 w-4 text-brand-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 text-sm">{prettyKey(t.key)}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {TEMPLATE_DESCRIPTIONS[t.key] ?? ""}
                </p>
                <p className="text-xs text-neutral-400 mt-1 truncate">
                  Subject: <span className="text-neutral-600">{t.subject}</span>
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-neutral-400 flex-shrink-0" />
          </Link>
        ))}
      </div>

      <p className="text-xs text-neutral-500 mt-6">
        Tip: use <code className="bg-neutral-100 px-1.5 py-0.5 rounded">{"{{placeholder}}"}</code> to insert values
        like the client&apos;s name or session date. The template editor lists which placeholders each email supports.
      </p>
    </div>
  );
}

function prettyKey(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
