import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProposalForm, type ProposalFormInitial } from "@/components/admin/ProposalForm";
import type { JSONContent } from "@tiptap/react";
import type { ProposalLineItem } from "@/app/actions/proposals";

export const metadata: Metadata = {
  title: "Edit Proposal — Admin",
  robots: { index: false, follow: false },
};

// Convert a UTC ISO timestamp to the YYYY-MM-DD the date <input> expects (Central).
function isoToCentralDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/admin/proposals/${id}`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  const { data } = await supabase
    .from("proposals")
    .select(
      "id, client_id, lead_id, client_email, client_name, title, summary, content, line_items, amount_cents, service_type, requires_signature, expires_at, internal_notes, status"
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const p = data as {
    id: string;
    client_id: string | null;
    lead_id: string | null;
    client_email: string;
    client_name: string | null;
    title: string;
    summary: string | null;
    content: JSONContent | null;
    line_items: ProposalLineItem[] | null;
    amount_cents: number;
    service_type: string | null;
    requires_signature: boolean;
    expires_at: string | null;
    internal_notes: string | null;
    status: string;
  };

  // Accepted/paid/declined proposals are immutable records — don't allow editing.
  if (["accepted", "paid", "declined"].includes(p.status)) {
    redirect("/admin/proposals");
  }

  const initial: ProposalFormInitial = {
    id: p.id,
    clientId: p.client_id,
    leadId: p.lead_id,
    clientEmail: p.client_email,
    clientName: p.client_name,
    title: p.title,
    summary: p.summary,
    content: p.content,
    lineItems: p.line_items,
    amountCents: p.amount_cents,
    serviceType: p.service_type,
    requiresSignature: p.requires_signature,
    expiresAtDate: isoToCentralDate(p.expires_at),
    internalNotes: p.internal_notes,
  };

  return (
    <div>
      <Link
        href="/admin/proposals"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> All proposals
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Edit proposal</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Update the scope or price, then save or re-send. Editing is locked once the client accepts.
        </p>
      </div>

      <ProposalForm initial={initial} />
    </div>
  );
}
