import type { Metadata } from "next";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Clients — Admin",
  robots: { index: false, follow: false },
};

type ClientRow = {
  id: string;
  full_name: string | null;
  email: string;
  company: string | null;
  created_at: string;
};

const SUB_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  inactive: "bg-neutral-100 text-neutral-500",
  cancelled: "bg-red-100 text-red-600",
  expired: "bg-red-100 text-red-600",
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "active", label: "Active subs" },
  { key: "pending", label: "Pending review" },
  { key: "inactive", label: "Inactive" },
];

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sub?: string }>;
}) {
  const supabase = await createClient();
  const { q: rawQ, sub } = await searchParams;
  const q = (rawQ ?? "").trim();

  // Resolve the subscription filter to a set of client_ids first.
  let filterIds: string[] | null = null;
  if (sub === "active" || sub === "inactive") {
    const wlQuery = supabase.from("watchlist_profiles").select("client_id");
    const { data } =
      sub === "active"
        ? await wlQuery.eq("subscription_status", "active")
        : await wlQuery.neq("subscription_status", "active");
    filterIds = ((data ?? []) as { client_id: string | null }[]).map((r) => r.client_id).filter(Boolean) as string[];
  } else if (sub === "pending") {
    const { data } = await supabase
      .from("watchlist_profiles")
      .select("client_id")
      .eq("review_status", "pending_review");
    filterIds = ((data ?? []) as { client_id: string | null }[]).map((r) => r.client_id).filter(Boolean) as string[];
  }

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, company, created_at")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  if (q) {
    const safe = q.replace(/[,%()]/g, " ");
    query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%`);
  }
  if (filterIds) {
    query = query.in("id", filterIds.length > 0 ? filterIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data: clientsRaw } = await query;
  const clients = (clientsRaw ?? []) as ClientRow[];

  // Subscription status for the displayed clients.
  let subMap: Record<string, string> = {};
  if (clients.length > 0) {
    const { data: wl } = await supabase
      .from("watchlist_profiles")
      .select("client_id, subscription_status")
      .in("client_id", clients.map((c) => c.id));
    subMap = Object.fromEntries(
      ((wl ?? []) as { client_id: string | null; subscription_status: string }[])
        .filter((r) => r.client_id)
        .map((r) => [r.client_id as string, r.subscription_status])
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Clients</h1>
        <p className="text-sm text-neutral-500 mt-1">{clients.length} {q || sub ? "matching" : "registered"} clients</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <form className="relative flex-1 max-w-sm">
          {sub ? <input type="hidden" name="sub" value={sub} /> : null}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, company…"
            className="w-full border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </form>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (f.key) params.set("sub", f.key);
            const href = `/admin/clients${params.toString() ? `?${params}` : ""}`;
            const active = (sub ?? "") === f.key;
            return (
              <Link
                key={f.key || "all"}
                href={href}
                className={
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " +
                  (active ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {clients.length === 0 ? (
          <EmptyState icon={Users} title="No clients found." description="Try a different search or filter." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hidden md:table-cell">Job Alerts</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hidden lg:table-cell">Company</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {clients.map((client) => {
                const status = subMap[client.id];
                return (
                  <tr key={client.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-neutral-900">
                      <Link href={`/admin/clients/${client.id}`} className="hover:text-brand-700 transition-colors">
                        {client.full_name ?? "Unnamed"}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-neutral-600">
                      <a href={`mailto:${client.email}`} className="hover:text-brand-700 transition-colors">
                        {client.email}
                      </a>
                    </td>
                    <td className="px-6 py-3 hidden md:table-cell">
                      {status ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SUB_BADGE[status] ?? "bg-neutral-100 text-neutral-500"}`}>
                          {status}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-neutral-500 hidden lg:table-cell">{client.company ?? "—"}</td>
                    <td className="px-6 py-3 text-neutral-400 hidden lg:table-cell">
                      {client.created_at
                        ? new Date(client.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
