import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar } from "lucide-react";
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
          <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
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
          {lead.current_role && (
            <Info icon={Briefcase} label="Current role">{lead.current_role}</Info>
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
