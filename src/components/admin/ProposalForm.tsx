"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { AiAssistPanel } from "@/components/admin/AiAssistPanel";
import { buildProposalScopePrompt } from "@/lib/ai/prompts";
import { localCentralToUtcIso } from "@/lib/time/central";
import {
  createProposal,
  updateProposal,
  sendProposal,
  type ProposalLineItem,
} from "@/app/actions/proposals";

const TEXTAREA_CLASS =
  "flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2";

type LineRow = { id: string; description: string; amount: string };

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ProposalFormInitial {
  id: string;
  clientId: string | null;
  leadId: string | null;
  clientEmail: string;
  clientName: string | null;
  title: string;
  summary: string | null;
  content: JSONContent | null;
  lineItems: ProposalLineItem[] | null;
  amountCents: number;
  serviceType: string | null;
  requiresSignature: boolean;
  expiresAtDate: string | null; // YYYY-MM-DD
  internalNotes: string | null;
}

export interface ProposalLeadContext {
  notes?: string | null;
  target_role?: string | null;
  timeline?: string | null;
  current_position?: string | null;
  admin_notes?: string | null;
}

export interface ProposalFormProps {
  prefillClientId?: string | null;
  prefillLeadId?: string | null;
  prefillClientEmail?: string | null;
  prefillClientName?: string | null;
  leadContext?: ProposalLeadContext | null;
  initial?: ProposalFormInitial;
}

export function ProposalForm({
  prefillClientId,
  prefillLeadId,
  prefillClientEmail,
  prefillClientName,
  leadContext,
  initial,
}: ProposalFormProps) {
  const router = useRouter();
  const isEdit = !!initial;
  const [loading, setLoading] = React.useState<"draft" | "send" | null>(null);

  const [clientEmail, setClientEmail] = React.useState(initial?.clientEmail ?? prefillClientEmail ?? "");
  const [clientName, setClientName] = React.useState(initial?.clientName ?? prefillClientName ?? "");
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [serviceType, setServiceType] = React.useState(initial?.serviceType ?? "");
  const [summary, setSummary] = React.useState(initial?.summary ?? "");
  const [content, setContent] = React.useState<JSONContent>(
    initial?.content ?? { type: "doc", content: [] }
  );
  const [amountDollars, setAmountDollars] = React.useState<string>(
    initial && initial.amountCents > 0 && (!initial.lineItems || initial.lineItems.length === 0)
      ? (initial.amountCents / 100).toFixed(2)
      : ""
  );
  const [requiresSignature, setRequiresSignature] = React.useState(initial?.requiresSignature ?? true);
  const [expiresDate, setExpiresDate] = React.useState(initial?.expiresAtDate ?? "");
  const [internalNotes, setInternalNotes] = React.useState(initial?.internalNotes ?? "");
  const [lineItems, setLineItems] = React.useState<LineRow[]>(
    initial?.lineItems && initial.lineItems.length > 0
      ? initial.lineItems.map((li) => ({
          id: newId(),
          description: li.description,
          amount: (li.amount_cents / 100).toFixed(2),
        }))
      : []
  );

  const usingLineItems = lineItems.length > 0;
  const lineItemsTotalCents = lineItems.reduce((sum, li) => {
    const n = parseFloat(li.amount);
    return sum + (Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0);
  }, 0);
  const manualAmountCents = (() => {
    const n = parseFloat(amountDollars);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
  })();
  const totalCents = usingLineItems ? lineItemsTotalCents : manualAmountCents;
  const totalLabel = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    totalCents / 100
  );

  function addLineItem() {
    setLineItems((prev) => [...prev, { id: newId(), description: "", amount: "" }]);
  }
  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }
  function updateLineItem(id: string, patch: Partial<Pick<LineRow, "description" | "amount">>) {
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  }

  function buildPayload() {
    const cleanLineItems: ProposalLineItem[] = lineItems
      .filter((li) => li.description.trim() && parseFloat(li.amount) > 0)
      .map((li) => ({
        description: li.description.trim(),
        amount_cents: Math.round(parseFloat(li.amount) * 100),
      }));
    return {
      clientId: initial?.clientId ?? prefillClientId ?? null,
      leadId: initial?.leadId ?? prefillLeadId ?? null,
      clientEmail: clientEmail.trim(),
      clientName: clientName.trim() || null,
      title: title.trim(),
      summary: summary.trim() || null,
      content,
      lineItems: cleanLineItems.length > 0 ? cleanLineItems : null,
      amountCents: cleanLineItems.length > 0
        ? cleanLineItems.reduce((s, li) => s + li.amount_cents, 0)
        : manualAmountCents,
      serviceType: serviceType.trim() || null,
      requiresSignature,
      expiresAt: expiresDate ? localCentralToUtcIso(expiresDate, "23:59") : null,
      internalNotes: internalNotes.trim() || null,
    };
  }

  function validate(): string | null {
    if (!clientEmail.trim()) return "Enter the client's email.";
    if (!title.trim()) return "Give the proposal a title.";
    if (totalCents > 0 && totalCents < 50) return "A paid proposal must be at least $0.50.";
    return null;
  }

  async function handleSubmit(mode: "draft" | "send") {
    const err = validate();
    if (err) return toast.error(err);
    const payload = buildPayload();

    setLoading(mode);
    try {
      if (isEdit) {
        const res = await updateProposal(initial!.id, payload);
        if (res.error) return toast.error(res.error);
        if (mode === "send") {
          const sent = await sendProposal(initial!.id);
          if (sent.error) return toast.error(sent.error);
          toast.success("Proposal sent to the client.");
        } else {
          toast.success("Proposal saved.");
        }
      } else {
        const res = await createProposal({ ...payload, sendNow: mode === "send" });
        if (res.error) return toast.error(res.error);
        toast.success(mode === "send" ? "Proposal sent to the client." : "Draft saved.");
      }
      router.push("/admin/proposals");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6 max-w-2xl">
      {/* Client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-email">Client email <span className="text-red-500">*</span></Label>
          <Input
            id="p-email"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="client@example.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Client name</Label>
          <Input
            id="p-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="First Last"
          />
        </div>
      </div>

      {/* Title + service */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-title">Proposal title <span className="text-red-500">*</span></Label>
          <Input
            id="p-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. HR Policy Audit & Handbook Refresh"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-service">Service type</Label>
          <Input
            id="p-service"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="e.g. HR Consulting"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1.5">
        <Label htmlFor="p-summary">Summary (shown in the email + page intro)</Label>
        <textarea
          id="p-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          className={TEXTAREA_CLASS}
          placeholder="A one or two sentence overview of what you're proposing…"
        />
      </div>

      {/* Scope / terms */}
      <div className="space-y-1.5">
        <Label>Scope &amp; terms</Label>
        <p className="text-xs text-neutral-500">
          The full proposal body the client reviews — deliverables, timeline, terms.
        </p>
        <AiAssistPanel
          label="Draft scope & terms with ChatGPT"
          instructions="Copy this into ChatGPT, then paste the drafted scope into the editor below and refine it."
          prompt={buildProposalScopePrompt({
            clientName,
            title,
            serviceType,
            summary,
            amountLabel: totalLabel,
            lead: leadContext ?? null,
          })}
        />
        <RichTextEditor
          initialContent={content}
          onChange={setContent}
          placeholder="Outline the scope of work, deliverables, timeline, and terms…"
        />
      </div>

      {/* Line items + amount */}
      <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Pricing</Label>
          <span className="text-sm font-semibold text-neutral-900">Total: {totalLabel}</span>
        </div>

        {usingLineItems ? (
          <div className="space-y-2">
            {lineItems.map((li, idx) => (
              <div key={li.id} className="flex items-center gap-2">
                <Input
                  value={li.description}
                  onChange={(e) => updateLineItem(li.id, { description: e.target.value })}
                  placeholder={`Line item ${idx + 1}`}
                  aria-label={`Line item ${idx + 1} description`}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={li.amount}
                  onChange={(e) => updateLineItem(li.id, { amount: e.target.value })}
                  placeholder="0.00"
                  aria-label={`Line item ${idx + 1} amount`}
                  className="w-32"
                />
                <button
                  type="button"
                  onClick={() => removeLineItem(li.id)}
                  aria-label="Remove line item"
                  className="p-1.5 rounded text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addLineItem}
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline pt-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add line item
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1.5 max-w-[12rem]">
              <Label htmlFor="p-amount">Total amount (USD)</Label>
              <Input
                id="p-amount"
                type="number"
                min={0}
                step={0.01}
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                placeholder="2500.00"
              />
              <p className="text-xs text-neutral-400">
                Enter $0 for a no-charge agreement (sign-only, no payment).
              </p>
            </div>
            <button
              type="button"
              onClick={addLineItem}
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Itemize instead
            </button>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-center gap-6">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={requiresSignature}
            onChange={(e) => setRequiresSignature(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-neutral-700">Require a typed signature to accept</span>
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="p-expires">Expires (optional)</Label>
          <Input
            id="p-expires"
            type="date"
            value={expiresDate}
            min={todayLocal()}
            onChange={(e) => setExpiresDate(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* Internal notes */}
      <div className="space-y-1.5">
        <Label htmlFor="p-internal">Internal notes (admin only)</Label>
        <textarea
          id="p-internal"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={2}
          className={TEXTAREA_CLASS}
          placeholder="Notes only you can see…"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="button" onClick={() => handleSubmit("send")} disabled={loading !== null}>
          {loading === "send" ? "Sending…" : isEdit ? "Save & send" : "Send proposal"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit("draft")}
          disabled={loading !== null}
        >
          {loading === "draft" ? "Saving…" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
