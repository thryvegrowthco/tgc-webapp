"use client";

// Phase 4 — the one reusable "Draft with ChatGPT" panel.
//
// Bring-your-own-ChatGPT: it shows a pre-built prompt for Rachel to copy into her
// ChatGPT, and (optionally) a paste-back box. It is domain-agnostic — `onApply`
// receives the RAW pasted text and each caller parses/routes it (e.g. splits
// labelled sections into fields, or saves via a server action). Copy-only when
// `onApply` is omitted. The panel toasts on copy; callers toast on apply.

import * as React from "react";
import { Sparkles, Copy, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface AiAssistPanelProps {
  label: string;
  prompt: string;
  instructions?: string;
  applyHint?: string;
  onApply?: (pastedText: string) => void | Promise<void>;
  applyLabel?: string;
  defaultOpen?: boolean;
}

export function AiAssistPanel({
  label,
  prompt,
  instructions,
  applyHint,
  onApply,
  applyLabel = "Apply to fields",
  defaultOpen = false,
}: AiAssistPanelProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [pasted, setPasted] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied — paste it into ChatGPT.");
    } catch {
      toast.error("Couldn't copy automatically — select the prompt text and copy it.");
    }
  }

  async function apply() {
    if (!onApply) return;
    if (!pasted.trim()) {
      toast.error("Paste ChatGPT's reply first.");
      return;
    }
    setBusy(true);
    try {
      await onApply(pasted);
      setPasted("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't apply the draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-brand-800"
        aria-expanded={open}
      >
        <Sparkles className="h-4 w-4 text-brand-600" />
        {label}
        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-xs text-neutral-500">
            {instructions ??
              "Copy this prompt into ChatGPT, then paste its reply below."}
          </p>

          {/* Prompt (read-only) */}
          <textarea
            readOnly
            value={prompt}
            rows={6}
            className="w-full max-h-48 overflow-auto rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 font-mono leading-relaxed focus:outline-none"
            onFocus={(e) => e.currentTarget.select()}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copyPrompt}>
              <Copy className="h-3.5 w-3.5" /> Copy prompt
            </Button>
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
            >
              Open ChatGPT <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Paste-back (only when an apply handler is provided) */}
          {onApply && (
            <div className="space-y-2 pt-1">
              {applyHint && <p className="text-xs text-neutral-500">{applyHint}</p>}
              <Textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste ChatGPT's reply here…"
                className="min-h-[90px] text-sm"
              />
              <Button type="button" size="sm" onClick={apply} disabled={busy}>
                {busy ? "Applying…" : applyLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
