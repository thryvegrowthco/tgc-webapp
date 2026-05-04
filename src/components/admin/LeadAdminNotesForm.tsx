"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadAdminNotes } from "@/app/actions/leads";

export function LeadAdminNotesForm({
  leadId,
  initialNotes,
}: {
  leadId: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = React.useState(initialNotes);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    await updateLeadAdminNotes(leadId, notes);
    setSavedAt(new Date());
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Internal notes about this lead (visible only to admins)..."
        className="min-h-[140px]"
      />
      <div className="flex items-center justify-between">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving..." : (<><Save className="h-3.5 w-3.5" /> Save notes</>)}
        </Button>
        {savedAt && !saving && (
          <span className="text-xs text-neutral-400">
            Saved {savedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        )}
      </div>
    </form>
  );
}
