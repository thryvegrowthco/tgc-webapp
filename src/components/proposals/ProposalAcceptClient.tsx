"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { acceptProposal, declineProposal } from "@/app/actions/proposals";

interface Props {
  token: string;
  requiresSignature: boolean;
  requiresPayment: boolean;
  amountLabel: string | null;
  /** True when the client already signed but hasn't paid (returning to finish). */
  alreadyAccepted: boolean;
}

export function ProposalAcceptClient({
  token,
  requiresSignature,
  requiresPayment,
  amountLabel,
  alreadyAccepted,
}: Props) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleAccept() {
    if (!alreadyAccepted) {
      if (requiresSignature && name.trim().length < 2) {
        return toast.error("Please type your full name to accept.");
      }
      if (!agreed) {
        return toast.error("Please confirm you've reviewed and agree to the proposal.");
      }
    }
    setSubmitting(true);
    // On success this redirects (to Stripe or the confirmation page); a returned
    // value means an error.
    const res = await acceptProposal({ token, signedName: name });
    if (res?.error) {
      setSubmitting(false);
      toast.error(res.error);
    }
  }

  async function handleDecline() {
    if (!confirm("Decline this proposal? Rachel will be notified.")) return;
    setSubmitting(true);
    const res = await declineProposal({ token });
    setSubmitting(false);
    if (res?.error) return toast.error(res.error);
    toast.success("Proposal declined. Thanks for letting us know.");
    router.refresh();
  }

  // Returning to complete payment after signing — no signature step.
  if (alreadyAccepted && requiresPayment) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          You&apos;ve accepted this proposal. Complete your secure payment to get started.
        </p>
        <Button onClick={handleAccept} disabled={submitting} className="w-full">
          {submitting ? "Redirecting…" : `Complete payment${amountLabel ? ` · ${amountLabel}` : ""}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requiresSignature && (
        <div className="space-y-1.5">
          <Label htmlFor="sig">Type your full name to accept</Label>
          <Input
            id="sig"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full legal name"
            disabled={submitting}
            autoComplete="name"
          />
        </div>
      )}

      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={submitting}
          className="h-4 w-4 mt-0.5 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
        />
        <span className="text-sm text-neutral-600">
          I&apos;ve reviewed the scope and terms above and agree to move forward
          {requiresPayment ? " with payment" : ""}.
        </span>
      </label>

      <Button onClick={handleAccept} disabled={submitting} className="w-full">
        {submitting
          ? "Processing…"
          : requiresPayment
            ? `Accept & Pay${amountLabel ? ` · ${amountLabel}` : ""}`
            : "Accept Proposal"}
      </Button>

      {requiresPayment && (
        <p className="text-xs text-neutral-400 text-center">
          You&apos;ll complete a secure Stripe payment to confirm.
        </p>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={handleDecline}
          disabled={submitting}
          className="text-xs text-neutral-400 hover:text-red-500 hover:underline disabled:opacity-40"
        >
          Decline this proposal
        </button>
      </div>
    </div>
  );
}
