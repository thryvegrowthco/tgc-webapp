"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/client";
import { sendTemplated } from "@/lib/email/render";
import { notifyAdmin } from "@/lib/notifications/admin";
import { formatCentralDate } from "@/lib/time/central";
import type { Json } from "@/types/database";
import type { JSONContent } from "@tiptap/react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export interface ProposalLineItem {
  description: string;
  amount_cents: number;
}

export interface ProposalDraftInput {
  clientId?: string | null;
  leadId?: string | null;
  clientEmail: string;
  clientName?: string | null;
  title: string;
  summary?: string | null;
  content: JSONContent;
  lineItems?: ProposalLineItem[] | null;
  amountCents: number;
  serviceType?: string | null;
  requiresSignature?: boolean;
  expiresAt?: string | null; // ISO or null
  internalNotes?: string | null;
}

function validateDraft(input: ProposalDraftInput): string | null {
  if (!isEmail((input.clientEmail ?? "").trim())) return "Enter a valid client email.";
  if (!input.title?.trim()) return "Give the proposal a title.";
  if (!Number.isFinite(input.amountCents) || input.amountCents < 0) {
    return "Enter a valid amount (0 or more).";
  }
  if (input.amountCents > 0 && input.amountCents < 50) {
    return "A paid proposal must be at least $0.50. Set $0 for a no-charge agreement.";
  }
  return null;
}

// ─── Admin: create / update / send / cancel ───────────────────────────────────

export async function createProposal(
  input: ProposalDraftInput & { sendNow?: boolean }
): Promise<{ error?: string; id?: string; token?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const invalid = validateDraft(input);
  if (invalid) return { error: invalid };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      client_id: input.clientId || null,
      lead_id: input.leadId || null,
      client_email: input.clientEmail.trim().toLowerCase(),
      client_name: input.clientName?.trim() || null,
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      content: (input.content ?? {}) as Json,
      line_items: (input.lineItems && input.lineItems.length > 0
        ? input.lineItems
        : null) as Json | null,
      amount_cents: Math.round(input.amountCents),
      service_type: input.serviceType?.trim() || null,
      requires_signature: input.requiresSignature ?? true,
      expires_at: input.expiresAt || null,
      internal_notes: input.internalNotes?.trim() || null,
      created_by: auth.userId,
    })
    .select("id, token")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create the proposal." };

  if (input.sendNow) {
    const sent = await sendProposal(data.id);
    if (sent.error) return { error: sent.error, id: data.id, token: data.token };
  }

  revalidatePath("/admin/proposals");
  return { id: data.id, token: data.token };
}

export async function updateProposal(
  id: string,
  input: ProposalDraftInput
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const invalid = validateDraft(input);
  if (invalid) return { error: invalid };

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("proposals")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Proposal not found." };
  // Once a client has acted on it, the terms are locked (an accepted proposal is
  // an immutable record). Edits are only allowed before acceptance.
  if (["accepted", "paid", "declined"].includes((existing as { status: string }).status)) {
    return { error: "This proposal has already been acted on and can no longer be edited." };
  }

  const { error } = await supabase
    .from("proposals")
    .update({
      client_id: input.clientId || null,
      lead_id: input.leadId || null,
      client_email: input.clientEmail.trim().toLowerCase(),
      client_name: input.clientName?.trim() || null,
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      content: (input.content ?? {}) as Json,
      line_items: (input.lineItems && input.lineItems.length > 0
        ? input.lineItems
        : null) as Json | null,
      amount_cents: Math.round(input.amountCents),
      service_type: input.serviceType?.trim() || null,
      requires_signature: input.requiresSignature ?? true,
      expires_at: input.expiresAt || null,
      internal_notes: input.internalNotes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/proposals");
  revalidatePath(`/admin/proposals/${id}`);
  return { success: true };
}

export async function sendProposal(id: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createServiceClient();
  const { data: p } = await supabase
    .from("proposals")
    .select("id, token, client_email, client_name, title, summary, service_type, amount_cents, status, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!p) return { error: "Proposal not found." };
  const prop = p as {
    token: string;
    client_email: string;
    client_name: string | null;
    title: string;
    summary: string | null;
    service_type: string | null;
    amount_cents: number;
    status: string;
    expires_at: string | null;
  };
  if (prop.status === "accepted" || prop.status === "paid") {
    return { error: "This proposal has already been accepted." };
  }
  if (prop.status === "cancelled") return { error: "This proposal was cancelled." };

  const expiryNote = prop.expires_at
    ? `This proposal is valid through ${formatCentralDate(prop.expires_at, { month: "long", day: "numeric", year: "numeric" })}.`
    : "";

  const result = await sendTemplated("proposal_sent", {
    to: prop.client_email,
    data: {
      client_name: prop.client_name?.split(" ")[0] || "there",
      proposal_title: prop.title,
      proposal_url: `${APP_URL}/proposal/${prop.token}`,
      service_type: prop.service_type ?? "",
      amount_formatted: prop.amount_cents > 0 ? formatCents(prop.amount_cents) : "",
      custom_message: prop.summary ?? "",
      expiry_note: expiryNote,
    },
  });
  if (!result.sent && result.error) return { error: `Email failed: ${result.error}` };

  await supabase
    .from("proposals")
    .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "accepted")
    .neq("status", "paid");

  revalidatePath("/admin/proposals");
  return { success: true };
}

export async function cancelProposal(id: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createServiceClient();
  const { data: p } = await supabase.from("proposals").select("status").eq("id", id).maybeSingle();
  if (!p) return { error: "Proposal not found." };
  if ((p as { status: string }).status === "paid") {
    return { error: "A paid proposal can't be cancelled. Issue a refund in Stripe instead." };
  }

  await supabase
    .from("proposals")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/proposals");
  return { success: true };
}

// ─── Public actions (no admin gate; the token is the bearer secret) ───────────

interface LiveProposal {
  id: string;
  token: string;
  status: string;
  expires_at: string | null;
  requires_signature: boolean;
  amount_cents: number;
  service_type: string | null;
  title: string;
  content: Json;
  client_email: string;
  client_name: string | null;
  client_id: string | null;
  accepted_at: string | null;
  accepted_snapshot: Json | null;
}

async function loadLiveProposal(
  supabase: ReturnType<typeof createServiceClient>,
  token: string
): Promise<{ error?: string; proposal?: LiveProposal }> {
  const { data } = await supabase
    .from("proposals")
    .select(
      "id, token, status, expires_at, requires_signature, amount_cents, service_type, title, content, client_email, client_name, client_id, accepted_at, accepted_snapshot"
    )
    .eq("token", token)
    .maybeSingle();
  const prop = data as LiveProposal | null;
  if (!prop) return { error: "We couldn't find this proposal." };
  if (prop.status === "paid") return { error: "This proposal has already been paid." };
  if (prop.status === "cancelled") return { error: "This proposal is no longer available." };
  if (prop.status === "declined") return { error: "This proposal was declined." };
  if (prop.expires_at && new Date(prop.expires_at) < new Date()) {
    return { error: "This proposal has expired. Reply to Rachel's email for an updated version." };
  }
  return { proposal: prop };
}

async function captureIp(): Promise<string | null> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    return fwd ? fwd.split(",")[0]?.trim() ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Accept a proposal: record the signature snapshot (immutable, mirrors
 * signed_service_agreements), then route to Stripe Checkout for paid proposals
 * or to the confirmation page for $0 agreements. Re-running after an abandoned
 * checkout preserves the original signature and just re-opens checkout.
 */
export async function acceptProposal(input: {
  token: string;
  signedName: string;
}): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error, proposal } = await loadLiveProposal(supabase, input.token);
  if (error || !proposal) return { error: error ?? "Proposal unavailable." };

  const signedName = (input.signedName ?? "").trim();
  if (proposal.requires_signature && signedName.length < 2) {
    return { error: "Please type your full name to accept." };
  }

  // Record acceptance once (don't overwrite the original snapshot on retry).
  if (proposal.status !== "accepted") {
    const ip = await captureIp();
    const { error: updErr } = await supabase
      .from("proposals")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_name: proposal.requires_signature ? signedName : null,
        accepted_ip: ip,
        accepted_snapshot: proposal.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal.id)
      .neq("status", "paid");
    if (updErr) return { error: "Couldn't record your acceptance. Please try again." };

    // Notify Rachel on first acceptance (in-app bell + email).
    await notifyAdmin({
      type: "proposal_accepted",
      subject: `Proposal accepted: ${proposal.client_name || proposal.client_email}`,
      title: `Proposal accepted — ${proposal.title}`,
      body:
        proposal.amount_cents > 0
          ? "The client accepted and is being taken to payment. You'll get a second alert when payment completes."
          : "The client accepted this no-charge proposal.",
      fields: [
        { label: "Client", value: proposal.client_name || proposal.client_email },
        { label: "Email", value: proposal.client_email },
        { label: "Proposal", value: proposal.title },
        ...(proposal.amount_cents > 0
          ? [{ label: "Amount", value: formatCents(proposal.amount_cents) }]
          : [{ label: "Amount", value: "No charge" }]),
        ...(signedName ? [{ label: "Signed", value: signedName }] : []),
      ],
      link: "/admin/proposals",
      ctaLabel: "Open proposals",
      clientId: proposal.client_id,
      replyTo: proposal.client_email || undefined,
    });
  }

  // No charge → done.
  if (proposal.amount_cents <= 0) {
    redirect(`/proposal/${input.token}/accepted`);
  }

  // Paid → Stripe Checkout (ad-hoc price_data, like invitations).
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: proposal.client_email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: proposal.title },
            unit_amount: proposal.amount_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        flow: "proposal",
        proposalId: proposal.id,
        clientName: proposal.client_name ?? "",
        clientEmail: proposal.client_email,
      },
      success_url: `${APP_URL}/proposal/${input.token}/accepted`,
      cancel_url: `${APP_URL}/proposal/${input.token}?cancelled=1`,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start checkout." };
  }

  if (!session.url) return { error: "Could not start checkout. Please try again." };
  redirect(session.url);
}

export async function declineProposal(input: { token: string }): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error, proposal } = await loadLiveProposal(supabase, input.token);
  if (error || !proposal) return { error: error ?? "Proposal unavailable." };
  if (proposal.status === "accepted") {
    return { error: "You've already accepted this proposal." };
  }

  await supabase
    .from("proposals")
    .update({ status: "declined", declined_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", proposal.id)
    .neq("status", "paid");

  await notifyAdmin({
    type: "proposal_accepted",
    subject: `Proposal declined: ${proposal.client_name || proposal.client_email}`,
    title: `Proposal declined — ${proposal.title}`,
    body: "The client declined this proposal. You may want to follow up with adjusted terms.",
    fields: [
      { label: "Client", value: proposal.client_name || proposal.client_email },
      { label: "Email", value: proposal.client_email },
      { label: "Proposal", value: proposal.title },
    ],
    link: "/admin/proposals",
    ctaLabel: "Open proposals",
    clientId: proposal.client_id,
    replyTo: proposal.client_email || undefined,
  });

  return {};
}
