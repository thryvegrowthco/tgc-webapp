"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, X, Link2 } from "lucide-react";
import { sendBookingInvitation, cancelBookingInvitation } from "@/app/actions/booking-invitations";

interface Props {
  invitationId: string;
  token: string;
  status: string;
  appUrl: string;
}

export function InvitationRowActions({ invitationId, token, status, appUrl }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const bookingUrl = `${appUrl}/book-session/${token}`;
  const isClosed = status === "accepted" || status === "cancelled";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success("Booking link copied.");
    } catch {
      toast.error("Couldn't copy — link: " + bookingUrl);
    }
  }

  async function resend() {
    setBusy(true);
    const res = await sendBookingInvitation(invitationId);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Invitation re-sent.");
    router.refresh();
  }

  async function cancel() {
    if (!confirm("Cancel this invitation? The booking link will stop working.")) return;
    setBusy(true);
    const res = await cancelBookingInvitation(invitationId);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Invitation cancelled.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={copyLink}
        title="Copy booking link"
        className="p-1.5 rounded text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
      >
        <Link2 className="h-4 w-4" />
      </button>
      {!isClosed && (
        <>
          <button
            type="button"
            onClick={resend}
            disabled={busy}
            title="Re-send invitation email"
            className="p-1.5 rounded text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            title="Cancel invitation"
            className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
