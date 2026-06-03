import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileSignature } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Signed Agreements — Admin",
  robots: { index: false, follow: false },
};

type SignedRow = {
  id: string;
  client_id: string;
  version_label: string;
  signed_full_name: string;
  signed_at: string;
};

type ProfileRow = { id: string; full_name: string | null; email: string };

interface PageProps {
  searchParams: Promise<{ version?: string }>;
}

export default async function SignedAgreementsPage({ searchParams }: PageProps) {
  const { version } = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("signed_service_agreements")
    .select("id, client_id, version_label, signed_full_name, signed_at")
    .order("signed_at", { ascending: false })
    .limit(500);

  if (version) query = query.eq("version_label", version);

  const { data: rowsRaw } = await query;
  const rows = (rowsRaw ?? []) as SignedRow[];

  // Resolve client names + emails
  const clientIds = Array.from(new Set(rows.map((r) => r.client_id)));
  let profiles: ProfileRow[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientIds);
    profiles = (data ?? []) as ProfileRow[];
  }
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  // Versions for filter chips
  const { data: versionsRaw } = await supabase
    .from("service_agreements")
    .select("version_label")
    .order("created_at", { ascending: false });
  const versions = (versionsRaw ?? []).map((v) => (v as { version_label: string }).version_label);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/legal"
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Service Agreement
        </Link>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Signed Agreements</h1>
        <p className="text-sm text-neutral-500 mt-1">{rows.length} signing record{rows.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-neutral-200 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">Version</span>
        <FilterChip label="All" href="/admin/legal/signed" active={!version} />
        {versions.map((v) => (
          <FilterChip key={v} label={v} href={`/admin/legal/signed?version=${encodeURIComponent(v)}`} active={version === v} />
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200">
          <EmptyState icon={FileSignature} title="No signed agreements yet." description="Once a client completes onboarding, their signing record appears here." />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Client</th>
                <th className="text-left px-4 py-2.5 font-medium">Signed as</th>
                <th className="text-left px-4 py-2.5 font-medium">Version</th>
                <th className="text-left px-4 py-2.5 font-medium">Signed</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row) => {
                const profile = profileMap[row.client_id];
                return (
                  <tr key={row.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{profile?.full_name ?? "—"}</div>
                      <div className="text-xs text-neutral-500">{profile?.email ?? row.client_id}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{row.signed_full_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
                        {row.version_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {new Date(row.signed_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/legal/signed/${row.id}`}
                        className="text-xs font-medium text-brand-700 hover:text-brand-800"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
        active ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
      }`}
    >
      {label}
    </Link>
  );
}
