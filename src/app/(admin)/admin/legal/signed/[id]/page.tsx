import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { AgreementRenderer } from "@/components/legal/AgreementRenderer";
import type { JSONContent } from "@tiptap/react";

export const metadata: Metadata = {
  title: "Signed Agreement — Admin",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

type SignedRow = {
  id: string;
  client_id: string;
  agreement_id: string;
  version_label: string;
  content_snapshot: JSONContent;
  signed_full_name: string;
  signed_at: string;
  ip_address: string | null;
};

type ProfileRow = { id: string; full_name: string | null; email: string };

export default async function SignedAgreementDetail({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: rowRaw } = await supabase
    .from("signed_service_agreements")
    .select("id, client_id, agreement_id, version_label, content_snapshot, signed_full_name, signed_at, ip_address")
    .eq("id", id)
    .single();

  if (!rowRaw) notFound();
  const row = rowRaw as unknown as SignedRow;

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", row.client_id)
    .maybeSingle();
  const profile = profileRaw as ProfileRow | null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="print:hidden">
        <Link
          href="/admin/legal/signed"
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to signed agreements
        </Link>
      </div>

      {/* Signing record header */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-neutral-900">Signed Service Agreement</h1>
          <PrintButton />
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Client</dt>
            <dd className="font-medium text-neutral-900">{profile?.full_name ?? "—"}</dd>
            <dd className="text-xs text-neutral-500">{profile?.email ?? row.client_id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Signed as</dt>
            <dd className="font-medium text-neutral-900">{row.signed_full_name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Version</dt>
            <dd className="font-medium text-neutral-900">{row.version_label}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Signed at</dt>
            <dd className="font-medium text-neutral-900">
              {new Date(row.signed_at).toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })}
            </dd>
          </div>
          {row.ip_address && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-neutral-500">IP address</dt>
              <dd className="text-neutral-700 font-mono text-xs">{row.ip_address}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Snapshot content (immutable as signed) */}
      <article className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 print:border-0 print:p-0">
        <AgreementRenderer content={row.content_snapshot} />
      </article>

      <p className="text-xs text-neutral-400 print:hidden">
        This is the immutable snapshot signed on{" "}
        {new Date(row.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
        Edits to the live agreement do not change this record.
      </p>
    </div>
  );
}

function PrintButton() {
  return (
    <a
      href="javascript:window.print()"
      className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-brand-700 print:hidden"
    >
      <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
    </a>
  );
}
