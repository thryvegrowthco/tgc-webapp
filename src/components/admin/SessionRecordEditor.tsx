"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings2, Bell, CalendarClock, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateSession } from "@/app/actions/booking";
import { rescheduleSession, sendSessionReminderNow, cancelSession } from "@/app/actions/sessions";
import { AiAssistPanel } from "@/components/admin/AiAssistPanel";
import {
  buildSessionSummaryPrompt,
  buildPrepBriefPrompt,
  splitInOrder,
  type SessionSummaryContext,
} from "@/lib/ai/prompts";

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const TEXTAREA_CLASS =
  "flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

const STATUS_OPTIONS = [
  { value: "intake_needed", label: "Intake needed" },
  { value: "intake_complete", label: "Intake complete" },
  { value: "session_scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No show" },
];
const PAYMENT_OPTIONS = [
  { value: "not_required", label: "Not required" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "waived", label: "Waived" },
];

function centralParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

export interface SessionRecordEditorProps {
  bookingId: string;
  initial: {
    workflowStatus: string;
    paymentStatus: string;
    sessionSummary: string | null;
    nextSteps: string | null;
    followUpNeeded: boolean;
    sessionAt: string | null;
  };
  /** Context for the "Draft with ChatGPT" assists (omit to hide them). */
  aiContext?: SessionSummaryContext;
}

export function SessionRecordEditor({ bookingId, initial, aiContext }: SessionRecordEditorProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [workflowStatus, setWorkflowStatus] = React.useState(initial.workflowStatus);
  const [paymentStatus, setPaymentStatus] = React.useState(initial.paymentStatus);
  const [sessionSummary, setSessionSummary] = React.useState(initial.sessionSummary ?? "");
  const [nextSteps, setNextSteps] = React.useState(initial.nextSteps ?? "");
  const [followUpNeeded, setFollowUpNeeded] = React.useState(initial.followUpNeeded);

  const parts = centralParts(initial.sessionAt);
  const [rDate, setRDate] = React.useState(parts.date);
  const [rTime, setRTime] = React.useState(parts.time);

  async function save() {
    setBusy(true);
    const res = await updateSession(bookingId, {
      workflow_status: workflowStatus,
      payment_status: paymentStatus,
      session_summary: sessionSummary.trim() || null,
      next_steps: nextSteps.trim() || null,
      follow_up_needed: followUpNeeded,
    });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Session updated.");
    router.refresh();
  }

  async function reschedule() {
    if (!rDate || !rTime) return toast.error("Pick a new date and time.");
    setBusy(true);
    const res = await rescheduleSession(bookingId, rDate, rTime);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Session rescheduled — client re-notified.");
    router.refresh();
  }

  async function remind() {
    setBusy(true);
    const res = await sendSessionReminderNow(bookingId);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Reminder sent.");
  }

  async function cancel() {
    if (!confirm("Cancel this session? The calendar event is removed.")) return;
    setBusy(true);
    const res = await cancelSession(bookingId);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Session cancelled.");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-brand-700"
      >
        <Settings2 className="h-3.5 w-3.5" /> Manage
      </button>
    );
  }

  return (
    <div className="w-full mt-2 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4 space-y-4">
      {aiContext && (
        <AiAssistPanel
          label="Prep brief with ChatGPT"
          instructions="A quick brief for you before the session. Copy into ChatGPT and read the result."
          prompt={buildPrepBriefPrompt(aiContext)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <select value={workflowStatus} onChange={(e) => setWorkflowStatus(e.target.value)} className={SELECT_CLASS}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Payment</Label>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={SELECT_CLASS}>
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {aiContext && (
        <AiAssistPanel
          label="Draft summary & next steps with ChatGPT"
          applyHint="Paste ChatGPT's reply (with ### SUMMARY and ### NEXT STEPS) to fill both fields below — then review and Save."
          applyLabel="Apply to summary & next steps"
          prompt={buildSessionSummaryPrompt(aiContext)}
          onApply={(raw) => {
            const [s, n] = splitInOrder(raw, ["SUMMARY", "NEXT STEPS"]);
            if (s) setSessionSummary(s);
            if (n) setNextSteps(n);
            toast.success("Draft applied — review the fields and click Save.");
          }}
        />
      )}

      <div className="space-y-1">
        <Label className="text-xs">Session summary (shared with client)</Label>
        <textarea value={sessionSummary} onChange={(e) => setSessionSummary(e.target.value)} rows={2} className={TEXTAREA_CLASS} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Next steps (shared with client)</Label>
        <textarea value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} rows={2} className={TEXTAREA_CLASS} />
      </div>
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={followUpNeeded}
          onChange={(e) => setFollowUpNeeded(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
        />
        <span className="text-sm text-neutral-700">Follow-up needed</span>
      </label>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={save} disabled={busy} className="h-9">
          <Save className="h-4 w-4 mr-1.5" /> Save
        </Button>
        <button
          type="button"
          onClick={remind}
          disabled={busy}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 hover:border-brand-300 disabled:opacity-40"
        >
          <Bell className="h-4 w-4" /> Send reminder
        </button>
      </div>

      {/* Reschedule */}
      <div className="pt-3 border-t border-neutral-200 space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" /> Reschedule (Central time)
        </Label>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="w-40 h-9" />
          <Input type="time" value={rTime} onChange={(e) => setRTime(e.target.value)} className="w-32 h-9" />
          <button
            type="button"
            onClick={reschedule}
            disabled={busy}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 hover:border-brand-300 disabled:opacity-40"
          >
            Reschedule
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:text-neutral-700">
          Close
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
        >
          Cancel session
        </button>
      </div>
    </div>
  );
}
