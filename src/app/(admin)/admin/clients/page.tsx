import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Clients — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminClientsPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, company, job_title, created_at")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Clients</h1>
        <p className="text-sm text-neutral-500 mt-1">{clients?.length ?? 0} registered clients</p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {!clients || clients.length === 0 ? (
          <EmptyState icon={Users} title="No clients yet." description="Clients will appear here once they sign up." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hidden lg:table-cell">Company</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-neutral-900">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="hover:text-brand-700 transition-colors"
                    >
                      {client.full_name ?? "Unnamed"}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-neutral-600">
                    <a
                      href={`mailto:${client.email}`}
                      className="hover:text-brand-700 transition-colors"
                    >
                      {client.email}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-neutral-500 hidden lg:table-cell">
                    {client.company ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-neutral-400 hidden lg:table-cell">
                    {client.created_at
                      ? new Date(client.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
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
