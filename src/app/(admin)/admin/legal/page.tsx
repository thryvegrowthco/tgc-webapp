import type { Metadata } from "next";
import Link from "next/link";
import { FileText, FileSignature, ExternalLink } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentAgreement } from "@/app/actions/legal";
import { ServiceAgreementForm } from "@/components/admin/ServiceAgreementForm";
import type { JSONContent } from "@tiptap/react";

export const metadata: Metadata = {
  title: "Legal — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLegalPage() {
  const current = await getCurrentAgreement();
  const supabase = createServiceClient();

  // Number of signing records for the stats tile
  const { count: signedCount } = await supabase
    .from("signed_service_agreements")
    .select("*", { count: "exact", head: true });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Service Agreement</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Edit the live agreement here. Publish a new version when terms change.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center mb-2">
            <FileText className="h-4 w-4 text-brand-600" />
          </div>
          <p className="text-lg font-bold text-neutral-900">
            {current ? current.version_label : "—"}
          </p>
          <p className="text-xs text-neutral-500">Current version</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-lg font-bold text-neutral-900">
            {current?.published_at
              ? new Date(current.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "—"}
          </p>
          <p className="text-xs text-neutral-500">Published</p>
        </div>

        <Link
          href="/admin/legal/signed"
          className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand-200 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-2">
            <FileSignature className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-lg font-bold text-neutral-900">{signedCount ?? 0}</p>
          <p className="text-xs text-neutral-500">Total signed agreements →</p>
        </Link>
      </div>

      {current ? (
        <>
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
            <p className="text-sm text-blue-900">
              The live agreement at <code className="bg-white px-1.5 py-0.5 rounded text-xs">/legal/service-agreement</code> reflects what you save here.
            </p>
            <a
              href="/legal/service-agreement"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-800 hover:text-blue-900"
            >
              View live <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <ServiceAgreementForm
            initial={{
              id: current.id,
              title: current.title,
              versionLabel: current.version_label,
              content: current.content as JSONContent,
            }}
          />
        </>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p className="text-sm text-neutral-500">
            No agreement on file. Run the migration <code>0011_service_agreements.sql</code> in Supabase to seed v1.
          </p>
        </div>
      )}
    </div>
  );
}
