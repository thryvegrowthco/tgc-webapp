import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Proposal Accepted — Thryve Growth Co.",
  robots: { index: false, follow: false },
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function ProposalAcceptedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("proposals")
    .select("title, status, amount_cents")
    .eq("token", token)
    .maybeSingle();
  const proposal = data as { title: string; status: string; amount_cents: number } | null;

  const isPaid = proposal?.status === "paid";
  const wasPaidProposal = (proposal?.amount_cents ?? 0) > 0;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-6 w-6 text-green-600" />
      </div>
      <h1 className="font-display text-2xl font-bold text-neutral-900">
        {isPaid ? "Payment complete — thank you!" : "Proposal accepted!"}
      </h1>
      <p className="text-neutral-600 mt-2">
        {isPaid
          ? "We've received your payment and a receipt is on its way. Rachel will be in touch shortly to kick things off."
          : wasPaidProposal
            ? "Thank you for accepting. If you completed payment, a receipt is on its way. Rachel will follow up to get started."
            : "Thank you for accepting. Rachel will be in touch shortly to get started."}
      </p>

      {proposal && (
        <div className="mt-6 text-left rounded-xl border border-neutral-200 bg-muted/40 p-5">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Proposal</p>
          <p className="text-sm font-medium text-neutral-900 mt-0.5">{proposal.title}</p>
          {wasPaidProposal && (
            <>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500 mt-3">Amount</p>
              <p className="text-sm font-medium text-neutral-900 mt-0.5">
                {formatCents(proposal.amount_cents)}
              </p>
            </>
          )}
        </div>
      )}

      <div className="mt-6">
        <Link href="/" className="inline-block text-sm text-brand-700 hover:underline">
          Back to Thryve Growth Co.
        </Link>
      </div>
    </div>
  );
}
