"use client";

import * as React from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  acceptBookingInvitation,
  createInvitationCheckoutSession,
} from "@/app/actions/booking-invitations";

export interface SelectorOption {
  id: string;
  dateLabel: string;
  timeLabel: string;
}

interface Props {
  token: string;
  options: SelectorOption[];
  requiresPayment: boolean;
  amountLabel: string | null;
}

export function InvitationSlotSelector({ token, options, requiresPayment, amountLabel }: Props) {
  const [selected, setSelected] = React.useState<string | null>(
    options.length === 1 ? options[0].id : null
  );
  const [submitting, setSubmitting] = React.useState(false);

  async function handleConfirm() {
    if (!selected) {
      toast.error("Please choose a time.");
      return;
    }
    setSubmitting(true);
    // Both actions redirect on success; a returned value means an error.
    const res = requiresPayment
      ? await createInvitationCheckoutSession({ token, optionId: selected })
      : await acceptBookingInvitation({ token, optionId: selected });
    if (res?.error) {
      setSubmitting(false);
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2" disabled={submitting}>
        <legend className="sr-only">Choose a session time</legend>
        {options.map((opt) => {
          const active = selected === opt.id;
          return (
            <label
              key={opt.id}
              className={
                "flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all " +
                (active
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                  : "border-neutral-200 bg-white hover:border-brand-300")
              }
            >
              <input
                type="radio"
                name="session-option"
                value={opt.id}
                checked={active}
                onChange={() => setSelected(opt.id)}
                className="h-4 w-4 text-brand-500 focus:ring-brand-500"
              />
              <Clock className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-neutral-900">{opt.dateLabel}</span>
                <span className="block text-sm text-neutral-600">{opt.timeLabel} (CT)</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <Button onClick={handleConfirm} disabled={submitting || !selected} className="w-full">
        {submitting
          ? "Confirming…"
          : requiresPayment
            ? `Continue to payment${amountLabel ? ` · ${amountLabel}` : ""}`
            : "Confirm my session time"}
      </Button>
      {requiresPayment && (
        <p className="text-xs text-neutral-400 text-center">
          You&apos;ll complete a secure payment to confirm your session.
        </p>
      )}
    </div>
  );
}
