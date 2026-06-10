import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeadStatusSelect } from "@/components/admin/LeadStatusSelect";
import { LeadAdminNotesForm } from "@/components/admin/LeadAdminNotesForm";
import type { Lead } from "@/types/database";

export const metadata: Metadata = {
  title: "Lead Detail, Admin",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminLeadDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: leadRaw } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const lead = leadRaw as Lead | null;
  if (!lead) notFound();

  // Proposals already created for this lead (so the convert action isn't duplicated).
  const { data: proposalRows } = await supabase
    .from("proposals")
    .select("id, title, status, amount_cents, created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });
  const proposals = (proposalRows ?? []) as {
    id: string;
    title: string;
    status: string;
    amount_cents: number;
    created_at: string;
  }[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to leads
      </Link>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-neutral-900">{lead.full_name}</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Captured from {lead.source.replace(/_/g, " ")} on{" "}
              {new Date(lead.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
            <Link
              href={`/admin/proposals/new?leadId=${lead.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors whitespace-nowrap"
            >
              <FileSignature className="h-3.5 w-3.5" /> Create proposal
            </Link>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <Info icon={Mail} label="Email">
            <a href={`mailto:${lead.email}`} className="text-brand-700 hover:text-brand-800">{lead.email}</a>
          </Info>
          {lead.phone && (
            <Info icon={Phone} label="Phone">
              <a href={`tel:${lead.phone}`} className="text-brand-700 hover:text-brand-800">{lead.phone}</a>
            </Info>
          )}
          {lead.current_position && (
            <Info icon={Briefcase} label="Current role">{lead.current_position}</Info>
          )}
          {lead.target_role && (
            <Info icon={Briefcase} label="Target role">{lead.target_role}</Info>
          )}
          {lead.location && (
            <Info icon={MapPin} label="Location">{lead.location}</Info>
          )}
          {lead.remote_preference && (
            <Info icon={MapPin} label="Work arrangement">
              <span className="capitalize">{lead.remote_preference}</span>
            </Info>
          )}
          {lead.timeline && (
            <Info icon={Calendar} label="Timeline">{formatTimeline(lead.timeline)}</Info>
          )}
        </dl>
      </div>

      {/* Lead's notes */}
      {lead.notes && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="font-display font-bold text-neutral-900 mb-3">What they shared</h2>
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {lead.notes}
          </p>
        </div>
      )}

      {/* Proposals for this lead */}
      {proposals.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="font-display font-bold text-neutral-900 mb-3">Proposals</h2>
          <div className="space-y-2">
            {proposals.map((p) => (
              <Link
                key={p.id}
                href={`/admin/proposals${["accepted", "paid", "declined"].includes(p.status) ? "" : `/${p.id}`}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-2 hover:bg-neutral-50 transition-colors"
              >
                <span className="min-w-0 truncate text-sm text-neutral-800">{p.title}</span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-neutral-500">
                    {p.amount_cents > 0
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.amount_cents / 100)
                      : "No charge"}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-neutral-400">{p.status}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Admin notes */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <h2 className="font-display font-bold text-neutral-900 mb-3">Internal notes</h2>
        <LeadAdminNotesForm leadId={lead.id} initialNotes={lead.admin_notes ?? ""} />
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1 flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className="text-neutral-800">{children}</dd>
    </div>
  );
}

function formatTimeline(value: string): string {
  switch (value) {
    case "actively_searching": return "Actively searching now";
    case "next_3_months": return "Within the next 3 months";
    case "next_6_months": return "Within the next 6 months";
    case "exploring": return "Just exploring";
    default: return value;
  }
}
