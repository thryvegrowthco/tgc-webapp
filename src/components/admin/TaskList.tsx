"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  completeTask,
  uncompleteTask,
  deleteTask,
} from "@/app/actions/tasks";
import type { AdminTask } from "@/types/database";

export interface TaskListItem extends AdminTask {
  clientName?: string | null;
}

interface TaskListProps {
  tasks: TaskListItem[];
  /** When true, the per-row client link is hidden (useful on a client detail page). */
  hideClientLink?: boolean;
  emptyMessage?: string;
}

export function TaskList({ tasks, hideClientLink, emptyMessage = "No tasks." }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="text-sm text-neutral-400 text-center py-6">{emptyMessage}</p>;
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} hideClientLink={hideClientLink} />
      ))}
    </ul>
  );
}

function TaskRow({ task, hideClientLink }: { task: TaskListItem; hideClientLink?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  // Lazy-init now once per mount — react-hooks/purity disallows Date.now()
  // directly in render, and re-evaluating per render is wasteful anyway.
  const [now] = React.useState(() => Date.now());
  const completed = task.completed_at !== null;
  const overdue = !completed && task.due_at !== null && new Date(task.due_at).getTime() < now;

  function toggleComplete() {
    startTransition(async () => {
      const result = completed
        ? await uncompleteTask(task.id)
        : await completeTask(task.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete this task?\n\n"${task.title}"`)) return;
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Task deleted.");
        router.refresh();
      }
    });
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={completed}
        onChange={toggleComplete}
        disabled={pending}
        className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 cursor-pointer disabled:opacity-50"
        aria-label={completed ? "Mark task as not completed" : "Mark task as completed"}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            completed ? "text-neutral-400 line-through" : "text-neutral-900"
          )}
        >
          {task.title}
        </p>
        {task.description && !completed && (
          <p className="text-xs text-neutral-500 mt-0.5 whitespace-pre-wrap">{task.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {task.due_at && (
            <span
              className={cn(
                "text-[11px]",
                completed
                  ? "text-neutral-400"
                  : overdue
                  ? "text-red-600 font-medium"
                  : "text-neutral-500"
              )}
            >
              {overdue ? "Overdue · " : "Due "}
              {new Date(task.due_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          {!hideClientLink && task.related_client_id && (
            <Link
              href={`/admin/clients/${task.related_client_id}`}
              className="inline-flex items-center gap-1 text-[11px] text-brand-700 hover:underline"
            >
              {task.clientName ?? "Client"}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-neutral-300 hover:text-red-600 transition-colors p-1 disabled:opacity-50"
        aria-label="Delete task"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
