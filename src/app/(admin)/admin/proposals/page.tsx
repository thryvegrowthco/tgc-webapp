// Admin list of consulting proposals. Sits alongside Invitations/Sessions as the
// "quote → accept → pay" pipeline for quote-based services (HR consulting,
// recruitment, culture work).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCentralDate } from "@/lib/time/central";
import { ProposalRowActions } from "@/components/admin/ProposalRowActions";

export const metadata: Metadata = {
  title: "Proposals — Admin",
  robots: { index: false, follow: false },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600 border-neutral-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  accepted: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  declined: "bg-red-100 text-red-700 border-red-200",
  expired: "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

type ProposalRow = {
  id: string;
  token: string;
  client_email: string;
  client_name: string | null;
  title: string;
  service_type: string | null;
  amount_cents: number;
  status: string;
  expires_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  created_at: string;
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function AdminProposalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/proposals");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  const { data: rows } = await supabase
    .from("proposals")
    .select(
      "id, token, client_email, client_name, title, service_type, amount_cents, status, expires_at, sent_at, accepted_at, paid_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const proposals = (rows ?? []) as ProposalRow[];

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Proposals</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Send a scoped quote for consulting work. The client reviews it, accepts, and pays online.
          </p>
        </div>
        <Link
          href="/admin/proposals/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> New proposal
        </Link>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <FileSignature className="h-6 w-6 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No proposals yet.</p>
          <Link href="/admin/proposals/new" className="text-sm text-brand-700 hover:underline mt-2 inline-block">
            Create your first proposal
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {proposals.map((p) => {
            const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.draft;
            const expired =
              !["accepted", "paid", "cancelled", "declined"].includes(p.status) &&
              p.expires_at &&
              new Date(p.expires_at) < new Date();
            const statusLine =
              p.status === "paid" && p.paid_at
                ? `paid ${formatCentralDate(p.paid_at, { month: "short", day: "numeric" })}`
                : p.status === "accepted" && p.accepted_at
                  ? `accepted ${formatCentralDate(p.accepted_at, { month: "short", day: "numeric" })}`
                  : p.sent_at
                    ? `sent ${formatCentralDate(p.sent_at, { month: "short", day: "numeric" })}`
                    : "draft — not sent yet";
            return (
              <div
                key={p.id}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-neutral-900 text-sm truncate">{p.title}</p>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold border ${
                        expired ? STATUS_BADGE.expired : badge
                      }`}
                    >
                      {expired ? "expired" : p.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {p.client_name || p.client_email}
                    {p.service_type ? ` · ${p.service_type}` : ""} ·{" "}
                    {p.amount_cents > 0 ? formatCents(p.amount_cents) : "No charge"} · {statusLine}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <ProposalRowActions
                    proposalId={p.id}
                    token={p.token}
                    status={p.status}
                    appUrl={APP_URL}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
