"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { retryCalendarEvent } from "@/app/actions/sessions";

/**
 * Admin "Create calendar event" retry. Used on an /admin/sessions row (and in
 * the session editor drawer) when a Google Meet session has `meet_link_pending`
 * because the calendar event failed to create (typically because Google
 * Calendar is disconnected). Reconnect in Integrations, then click to retry.
 */
export function RetryCalendarEventButton({
  bookingId,
  className,
  label = "Create calendar event",
}: {
  bookingId: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    setBusy(true);
    const res = await retryCalendarEvent(bookingId);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.meetLink ? "Calendar event created with a Meet link." : "Calendar event created.");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800 disabled:opacity-40",
        className
      )}
    >
      <CalendarPlus className="h-3.5 w-3.5" /> {busy ? "Creating…" : label}
    </button>
  );
}
