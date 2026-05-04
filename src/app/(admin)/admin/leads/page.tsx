import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/types/database";

export const metadata: Metadata = {
  title: "Leads, Admin",
  robots: { index: false, follow: false },
};

const statusBadge: Record<string, string> = {
  new: "bg-brand-100 text-brand-700",
  contacted: "bg-blue-100 text-blue-700",
  qualified: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-neutral-100 text-neutral-500",
};

export default async function AdminLeadsPage() {
  const supabase = await createClient();

  const { data: leadsRaw } = await supabase
    .from("leads")
    .select("id, full_name, email, target_role, location, source, status, created_at")
    .order("created_at", { ascending: false });

  const leads = (leadsRaw ?? []) as Pick<
    Lead,
    "id" | "full_name" | "email" | "target_role" | "location" | "source" | "status" | "created_at"
  >[];

  const counts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  const summary = [
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "qualified", label: "Qualified" },
    { key: "converted", label: "Converted" },
    { key: "lost", label: "Lost" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Leads</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {leads.length} {leads.length === 1 ? "lead" : "leads"} from the Job Watchlist form
        </p>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {summary.map((s) => (
          <div key={s.key} className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">
              {s.label}
            </p>
            <p className="font-display text-2xl font-bold text-neutral-900">{counts[s.key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {leads.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No leads yet."
            description="Leads from /services/job-alerts will show up here as they come in."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hidden md:table-cell">Target role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hidden lg:table-cell">Received</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-neutral-900">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="hover:text-brand-700 transition-colors"
                    >
                      {lead.full_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-neutral-600">
                    <a href={`mailto:${lead.email}`} className="hover:text-brand-700 transition-colors">
                      {lead.email}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-neutral-500 hidden md:table-cell">
                    {lead.target_role ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-neutral-400 hidden lg:table-cell">
                    {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge[lead.status] ?? "bg-neutral-100 text-neutral-500"}`}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
