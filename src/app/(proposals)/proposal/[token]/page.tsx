import type { Metadata } from "next";
import Link from "next/link";
import type { JSONContent } from "@tiptap/react";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCentralDate } from "@/lib/time/central";
import { ProposalContent } from "@/components/proposals/ProposalContent";
import { ProposalAcceptClient } from "@/components/proposals/ProposalAcceptClient";

export const metadata: Metadata = {
  title: "Your Proposal — Thryve Growth Co.",
  robots: { index: false, follow: false },
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8">
      {children}
    </div>
  );
}

function ClosedState({ heading, body }: { heading: string; body: string }) {
  return (
    <Card>
      <h1 className="font-display text-xl font-bold text-neutral-900 mb-2">{heading}</h1>
      <p className="text-neutral-600 leading-relaxed">{body}</p>
      <p className="text-sm text-neutral-500 mt-4">
        Questions? Reply to Rachel&apos;s email or write to{" "}
        <a href="mailto:hello@thryvegrowth.co" className="text-brand-700 underline underline-offset-4">
          hello@thryvegrowth.co
        </a>
        .
      </p>
    </Card>
  );
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

interface ProposalRow {
  id: string;
  status: string;
  expires_at: string | null;
  requires_signature: boolean;
  amount_cents: number;
  service_type: string | null;
  title: string;
  summary: string | null;
  content: JSONContent | null;
  line_items: { description: string; amount_cents: number }[] | null;
  client_name: string | null;
  viewed_at: string | null;
}

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("proposals")
    .select(
      "id, status, expires_at, requires_signature, amount_cents, service_type, title, summary, content, line_items, client_name, viewed_at"
    )
    .eq("token", token)
    .maybeSingle();
  const proposal = data as ProposalRow | null;

  if (!proposal) {
    return (
      <ClosedState
        heading="Proposal not found"
        body="We couldn't find this proposal. It may be from an old email, or the address was mistyped."
      />
    );
  }
  if (proposal.status === "paid") {
    return (
      <ClosedState
        heading="This proposal is paid"
        body="Thank you — your payment is complete and we're all set to begin. Check your email for the receipt."
      />
    );
  }
  if (proposal.status === "cancelled") {
    return (
      <ClosedState
        heading="This proposal was withdrawn"
        body="Reply to Rachel's email and she'll send over an updated version."
      />
    );
  }
  if (proposal.status === "declined") {
    return (
      <ClosedState
        heading="This proposal was declined"
        body="No problem. If you'd like to revisit it, just reply to Rachel's email."
      />
    );
  }
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
    return (
      <ClosedState
        heading="This proposal has expired"
        body="No problem — reply to Rachel's email and she'll send a refreshed proposal."
      />
    );
  }

  // Best-effort first-view stamp for Rachel's visibility (no status change).
  if (!proposal.viewed_at) {
    await supabase
      .from("proposals")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", proposal.id)
      .is("viewed_at", null);
  }

  const requiresPayment = proposal.amount_cents > 0;
  const amountLabel = requiresPayment ? formatCents(proposal.amount_cents) : null;
  const alreadyAccepted = proposal.status === "accepted";

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-[11px] uppercase tracking-wide text-brand-600 font-semibold mb-1">Proposal</p>
        <h1 className="font-display text-2xl font-bold text-neutral-900">{proposal.title}</h1>
        {proposal.summary && (
          <p className="text-neutral-600 mt-2 leading-relaxed">{proposal.summary}</p>
        )}

        <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {proposal.service_type && (
            <div className="rounded-lg bg-muted/60 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-neutral-500">Service</dt>
              <dd className="text-sm font-medium text-neutral-900 mt-0.5">{proposal.service_type}</dd>
            </div>
          )}
          <div className="rounded-lg bg-muted/60 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-neutral-500">Investment</dt>
            <dd className="text-sm font-medium text-neutral-900 mt-0.5">
              {requiresPayment ? amountLabel : "No charge"}
            </dd>
          </div>
          {proposal.expires_at && (
            <div className="rounded-lg bg-muted/60 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-neutral-500">Valid through</dt>
              <dd className="text-sm font-medium text-neutral-900 mt-0.5">
                {formatCentralDate(proposal.expires_at, { month: "short", day: "numeric", year: "numeric" })}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Scope & terms */}
      <Card>
        <ProposalContent content={proposal.content} />

        {proposal.line_items && proposal.line_items.length > 0 && (
          <div className="mt-6 border-t border-neutral-200 pt-4">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500 mb-2">Pricing</p>
            <table className="w-full text-sm">
              <tbody>
                {proposal.line_items.map((li, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 text-neutral-700">{li.description}</td>
                    <td className="py-2 text-right font-medium text-neutral-900">
                      {formatCents(li.amount_cents)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-3 font-semibold text-neutral-900">Total</td>
                  <td className="pt-3 text-right font-semibold text-neutral-900">
                    {formatCents(proposal.amount_cents)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Accept */}
      <Card>
        <h2 className="font-display text-lg font-bold text-neutral-900 mb-1">
          {alreadyAccepted && requiresPayment ? "Complete your payment" : "Ready to move forward?"}
        </h2>
        {!alreadyAccepted && (
          <p className="text-sm text-neutral-500 mb-4">
            {requiresPayment
              ? "Accept the proposal and complete payment to get started."
              : "Accept the proposal to get started."}
          </p>
        )}
        <ProposalAcceptClient
          token={token}
          requiresSignature={proposal.requires_signature}
          requiresPayment={requiresPayment}
          amountLabel={amountLabel}
          alreadyAccepted={alreadyAccepted}
        />
      </Card>

      <p className="text-center text-xs text-neutral-400">
        Questions about anything here?{" "}
        <Link href="mailto:hello@thryvegrowth.co" className="text-brand-600 underline underline-offset-4">
          Reply to the email
        </Link>{" "}
        and Rachel will help.
      </p>
    </div>
  );
}
