"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, CheckCircle2 } from "lucide-react";
import { sendSessionReminderNow } from "@/app/actions/sessions";
import { updateSession } from "@/app/actions/booking";

export function SessionQuickActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function remind() {
    setBusy(true);
    const res = await sendSessionReminderNow(bookingId);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Reminder sent to the client.");
  }

  async function complete() {
    if (!confirm("Mark this session complete?")) return;
    setBusy(true);
    const res = await updateSession(bookingId, { workflow_status: "completed" });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Session marked complete.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={remind}
        disabled={busy}
        title="Send reminder now"
        className="p-1.5 rounded text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-40"
      >
        <Bell className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={complete}
        disabled={busy}
        title="Mark complete"
        className="p-1.5 rounded text-neutral-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>
    </div>
  );
}
