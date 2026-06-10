"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Target, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createGoal, updateGoal, deleteGoal } from "@/app/actions/goals";
import type { ClientGoal, ClientGoalStatus } from "@/types/database";

const SELECT_CLASS =
  "h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500";

const STATUS_META: Record<ClientGoalStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In progress", className: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  paused: { label: "Paused", className: "bg-neutral-100 text-neutral-500" },
};
const STATUS_ORDER: ClientGoalStatus[] = ["active", "in_progress", "completed", "paused"];

function formatDate(d: string | null): string | null {
  if (!d) return null;
  // target_date is a plain YYYY-MM-DD — render without timezone shifting.
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  /** Whose goals these are. The client's own id on the dashboard, or the target client on the admin page. */
  clientId: string;
  goals: ClientGoal[];
  /** Copy tweaks for the admin-on-behalf context. */
  adminMode?: boolean;
}

export function GoalsManager({ clientId, goals, adminMode = false }: Props) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return toast.error("Give the goal a title.");
    setBusy(true);
    const res = await createGoal({
      clientId,
      title: title.trim(),
      detail: detail.trim() || null,
      targetDate: targetDate || null,
    });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Goal added.");
    setTitle("");
    setDetail("");
    setTargetDate("");
    setAdding(false);
    router.refresh();
  }

  async function changeStatus(id: string, status: ClientGoalStatus) {
    const res = await updateGoal(id, { status });
    if (res.error) return toast.error(res.error);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this goal?")) return;
    const res = await deleteGoal(id);
    if (res.error) return toast.error(res.error);
    toast.success("Goal deleted.");
    router.refresh();
  }

  // Display order: by status bucket, then by target date / creation.
  const sorted = [...goals].sort((a, b) => {
    const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (s !== 0) return s;
    if (a.target_date && b.target_date) return a.target_date.localeCompare(b.target_date);
    if (a.target_date) return -1;
    if (b.target_date) return 1;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <div className="space-y-3">
      {sorted.length === 0 && !adding && (
        <p className="text-sm text-neutral-400">
          {adminMode ? "No goals yet for this client." : "No goals yet — add what you're working toward."}
        </p>
      )}

      {sorted.map((goal) =>
        editingId === goal.id ? (
          <GoalEditRow
            key={goal.id}
            goal={goal}
            onCancel={() => setEditingId(null)}
            onSaved={() => {
              setEditingId(null);
              router.refresh();
            }}
          />
        ) : (
          <div key={goal.id} className="rounded-lg border border-neutral-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900">{goal.title}</p>
                {goal.detail && <p className="text-xs text-neutral-600 mt-0.5 whitespace-pre-wrap">{goal.detail}</p>}
                {goal.target_date && (
                  <p className="text-[11px] text-neutral-400 mt-1">Target: {formatDate(goal.target_date)}</p>
                )}
              </div>
              <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0", STATUS_META[goal.status].className)}>
                {STATUS_META[goal.status].label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <select
                value={goal.status}
                onChange={(e) => changeStatus(goal.id, e.target.value as ClientGoalStatus)}
                className={SELECT_CLASS}
                aria-label="Goal status"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setEditingId(goal.id)}
                className="p-1.5 rounded text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                aria-label="Edit goal"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => remove(goal.id)}
                className="p-1.5 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Delete goal"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      )}

      {adding ? (
        <form onSubmit={handleAdd} className="rounded-lg border border-neutral-200 p-3 space-y-2.5">
          <div className="space-y-1">
            <Label htmlFor="goal-title" className="text-xs">Goal <span className="text-red-500">*</span></Label>
            <Input id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Land a director-level role" className="h-9 text-sm" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="goal-detail" className="text-xs">Detail (optional)</Label>
            <Textarea id="goal-detail" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="What does success look like?" className="min-h-[60px] text-sm" />
          </div>
          <div className="space-y-1 max-w-[12rem]">
            <Label htmlFor="goal-target" className="text-xs">Target date (optional)</Label>
            <Input id="goal-target" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={busy}>{busy ? "Adding…" : "Add goal"}</Button>
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-neutral-500 hover:underline">Cancel</button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline"
        >
          {sorted.length === 0 ? <Target className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {adminMode ? "Add a goal" : "Add a goal"}
        </button>
      )}
    </div>
  );
}

function GoalEditRow({ goal, onCancel, onSaved }: { goal: ClientGoal; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = React.useState(goal.title);
  const [detail, setDetail] = React.useState(goal.detail ?? "");
  const [targetDate, setTargetDate] = React.useState(goal.target_date ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (title.trim().length < 2) return toast.error("Give the goal a title.");
    setSaving(true);
    const res = await updateGoal(goal.id, {
      title: title.trim(),
      detail: detail.trim() || null,
      targetDate: targetDate || null,
    });
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success("Goal updated.");
    onSaved();
  }

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3 space-y-2.5">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" placeholder="Goal" />
      <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} className="min-h-[60px] text-sm" placeholder="Detail (optional)" />
      <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="h-9 text-sm max-w-[12rem]" />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
        </Button>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:underline">
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}
