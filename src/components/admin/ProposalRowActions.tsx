"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Send, X, Link2, Pencil } from "lucide-react";
import { sendProposal, cancelProposal } from "@/app/actions/proposals";

interface Props {
  proposalId: string;
  token: string;
  status: string;
  appUrl: string;
}

export function ProposalRowActions({ proposalId, token, status, appUrl }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const proposalUrl = `${appUrl}/proposal/${token}`;
  // Once accepted or paid the terms are locked; declined/cancelled are terminal.
  const isLocked = ["accepted", "paid", "declined", "cancelled"].includes(status);
  const isEditable = status === "draft" || status === "sent";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(proposalUrl);
      toast.success("Proposal link copied.");
    } catch {
      toast.error("Couldn't copy — link: " + proposalUrl);
    }
  }

  async function send() {
    setBusy(true);
    const res = await sendProposal(proposalId);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(status === "draft" ? "Proposal sent." : "Proposal re-sent.");
    router.refresh();
  }

  async function cancel() {
    if (!confirm("Cancel this proposal? The link will stop working.")) return;
    setBusy(true);
    const res = await cancelProposal(proposalId);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Proposal cancelled.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={copyLink}
        title="Copy proposal link"
        className="p-1.5 rounded text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
      >
        <Link2 className="h-4 w-4" />
      </button>
      {isEditable && (
        <Link
          href={`/admin/proposals/${proposalId}`}
          title="Edit proposal"
          className="p-1.5 rounded text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      )}
      {isEditable && (
        <button
          type="button"
          onClick={send}
          disabled={busy}
          title={status === "draft" ? "Send proposal email" : "Re-send proposal email"}
          className="p-1.5 rounded text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      )}
      {!isLocked && (
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          title="Cancel proposal"
          className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
