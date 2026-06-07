"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rss } from "lucide-react";
import { toggleJobSource } from "@/app/actions/watchlist";
import type { JobSourceRow } from "@/types/database";

export function JobSourceCard({ source }: { source: JobSourceRow }) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(source.enabled);
  const [busy, setBusy] = React.useState(false);

  async function onToggle() {
    const next = !enabled;
    setEnabled(next);
    setBusy(true);
    try {
      await toggleJobSource(source.provider, next);
      toast.success(next ? `${source.label} enabled` : `${source.label} disabled`);
      router.refresh();
    } catch {
      setEnabled(!next);
      toast.error("Couldn't update that source.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2.5 bg-brand-50 rounded-lg flex-shrink-0">
          <Rss className="h-4 w-4 text-brand-600" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-neutral-900 text-sm">{source.label}</p>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">{source.provider}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={busy}
        onClick={onToggle}
        className={
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-50 " +
          (enabled ? "bg-brand-600" : "bg-neutral-300")
        }
      >
        <span
          className={
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
            (enabled ? "translate-x-6" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}
