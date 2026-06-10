import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProposalForm, type ProposalLeadContext } from "@/components/admin/ProposalForm";

export const metadata: Metadata = {
  title: "New Proposal — Admin",
  robots: { index: false, follow: false },
};

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; leadId?: string }>;
}) {
  const { clientId, leadId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/proposals/new");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  // Prefill from a client profile or a captured lead so a consultation can be
  // converted into a proposal without re-typing contact details.
  let prefillEmail: string | null = null;
  let prefillName: string | null = null;
  let leadContext: ProposalLeadContext | null = null;
  if (clientId) {
    const { data: client } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", clientId)
      .maybeSingle();
    const c = client as { email: string; full_name: string | null } | null;
    prefillEmail = c?.email ?? null;
    prefillName = c?.full_name ?? null;
  } else if (leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("email, full_name, notes, target_role, timeline, current_position, admin_notes")
      .eq("id", leadId)
      .maybeSingle();
    const l = lead as
      | {
          email: string;
          full_name: string | null;
          notes: string | null;
          target_role: string | null;
          timeline: string | null;
          current_position: string | null;
          admin_notes: string | null;
        }
      | null;
    prefillEmail = l?.email ?? null;
    prefillName = l?.full_name ?? null;
    if (l) {
      leadContext = {
        notes: l.notes,
        target_role: l.target_role,
        timeline: l.timeline,
        current_position: l.current_position,
        admin_notes: l.admin_notes,
      };
    }
  }

  return (
    <div>
      <Link
        href="/admin/proposals"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> All proposals
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">New proposal</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Outline the scope and price. Send it and the client can review, accept, and pay online.
        </p>
      </div>

      <ProposalForm
        prefillClientId={clientId ?? null}
        prefillLeadId={leadId ?? null}
        prefillClientEmail={prefillEmail}
        prefillClientName={prefillName}
        leadContext={leadContext}
      />
    </div>
  );
}
