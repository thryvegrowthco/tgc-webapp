"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTask } from "@/app/actions/tasks";

interface AddTaskFormProps {
  /** Pre-fill the client this task belongs to. */
  clientId?: string;
  /** Pre-fill the booking this task belongs to. */
  bookingId?: string;
  /** Override the trigger button label. */
  triggerLabel?: string;
}

export function AddTaskForm({ clientId, bookingId, triggerLabel = "Add task" }: AddTaskFormProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setDueAt("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    startTransition(async () => {
      const result = await createTask({
        title,
        description: description || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        relatedClientId: clientId ?? null,
        relatedBookingId: bookingId ?? null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Task added.");
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        {triggerLabel}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="task-title">Title <span className="text-red-500">*</span></Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to happen?"
          required
          autoFocus
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-due">Due (optional)</Label>
          <Input
            id="task-due"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-description">Notes (optional)</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any context to remember"
            rows={1}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save task"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
