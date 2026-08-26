"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown in the heading so it's obvious who is being comped. */
  clientName: string;
  /** Copy differs slightly when they already have a lapsed/prior comp. */
  isRegrant?: boolean;
  loading?: boolean;
  onConfirm: (values: { note: string; until: string }) => void;
}

export function GrantWatchlistAccessDialog({
  open,
  onOpenChange,
  clientName,
  isRegrant = false,
  loading = false,
  onConfirm,
}: Props) {
  const [note, setNote] = React.useState("");
  const [until, setUntil] = React.useState("");

  // Reset whenever the dialog reopens so a previous entry can't leak through.
  React.useEffect(() => {
    if (open) {
      setNote("");
      setUntil("");
    }
  }, [open]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-full max-w-md bg-white rounded-xl shadow-xl p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-50 rounded-lg">
              <Gift className="h-4 w-4 text-brand-600" />
            </div>
            <Dialog.Title className="font-display font-bold text-neutral-900 text-lg">
              {isRegrant ? "Re-grant free access" : "Grant free access"}
            </Dialog.Title>
          </div>

          <Dialog.Description className="text-sm text-neutral-500 mb-5">
            {clientName} gets full Job Alerts &amp; Watchlist access at no cost — curated matches
            and the weekly digest, exactly like a paying client. No card, no invoice, no Stripe
            subscription.
          </Dialog.Description>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="comp-note">
                Reason <span className="text-neutral-400 font-normal">(optional, only you see it)</span>
              </Label>
              <Textarea
                id="comp-note"
                rows={2}
                placeholder="e.g. Friend — free while she job hunts"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-until">
                Ends on <span className="text-neutral-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="comp-until"
                type="date"
                min={today}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
              <p className="text-xs text-neutral-400">
                Leave blank for no end date. If set, access turns off automatically that day —
                you&apos;ll get a note when it does.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onConfirm({ note, until })} disabled={loading}>
              {loading ? "Granting…" : isRegrant ? "Re-grant access" : "Grant access"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
