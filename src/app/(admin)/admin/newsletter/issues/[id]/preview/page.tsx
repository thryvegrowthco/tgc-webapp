import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Preview — Newsletter",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: issueRaw } = await supabase
    .from("newsletter_issues")
    .select("id, title, subject, preheader")
    .eq("id", id)
    .single();

  if (!issueRaw) notFound();
  const issue = issueRaw as { id: string; title: string; subject: string; preheader: string };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <Link
          href={`/admin/newsletter/issues/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:text-brand-800 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to editor
        </Link>
        <h1 className="font-display text-xl font-bold text-neutral-900">Preview</h1>
        <p className="text-xs text-neutral-500 mt-1">
          This is how the email looks in a subscriber&apos;s inbox.
        </p>
      </div>

      {/* Fake inbox header */}
      <div className="bg-white rounded-t-xl border border-neutral-200 px-5 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
          <Mail className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-neutral-500">From: Thryve Growth Co. &lt;hello@go.thryvegrowth.co&gt;</p>
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {issue.subject || "(no subject)"}
          </p>
          {issue.preheader && (
            <p className="text-xs text-neutral-500 truncate">{issue.preheader}</p>
          )}
        </div>
      </div>

      <iframe
        src={`/api/admin/newsletter/preview/${id}`}
        title="Newsletter preview"
        className="w-full bg-white rounded-b-xl border border-t-0 border-neutral-200"
        style={{ height: "75vh" }}
      />
    </div>
  );
}
