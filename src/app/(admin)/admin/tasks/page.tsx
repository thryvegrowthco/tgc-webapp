import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { TaskList, type TaskListItem } from "@/components/admin/TaskList";
import { AddTaskForm } from "@/components/admin/AddTaskForm";
import type { AdminTask } from "@/types/database";

export const metadata: Metadata = {
  title: "Tasks — Admin",
  robots: { index: false, follow: false },
};

type Filter = "upcoming" | "overdue" | "completed";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
];

function parseFilter(raw: string | string[] | undefined): Filter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "overdue" || value === "completed") return value;
  return "upcoming";
}

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = parseFilter(rawFilter);

  const supabase = await createClient();

  let query = supabase
    .from("admin_tasks")
    .select("id, title, description, due_at, completed_at, related_booking_id, related_client_id, created_by, created_at")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);

  const nowIso = new Date().toISOString();
  if (filter === "upcoming") {
    query = query.is("completed_at", null);
  } else if (filter === "overdue") {
    query = query.is("completed_at", null).lt("due_at", nowIso);
  } else {
    query = query.not("completed_at", "is", null).order("completed_at", { ascending: false });
  }

  const { data: tasksRaw } = await query;
  const tasks = (tasksRaw ?? []) as AdminTask[];

  // Hydrate related client names for the inline links.
  const clientIds = [...new Set(tasks.map((t) => t.related_client_id).filter(Boolean))] as string[];
  const clientNameById = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientIds);
    for (const c of clients ?? []) {
      clientNameById.set(c.id, (c.full_name as string | null) ?? c.email ?? "Client");
    }
  }

  const tasksWithClient: TaskListItem[] = tasks.map((t) => ({
    ...t,
    clientName: t.related_client_id ? clientNameById.get(t.related_client_id) ?? null : null,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Tasks</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Your to-do list, scoped to whichever filter you pick.
          </p>
        </div>
        <AddTaskForm triggerLabel="Add task" />
      </div>

      <nav className="flex gap-1 border-b border-neutral-200" aria-label="Task filters">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={`/admin/tasks?filter=${f.value}`}
              className={cn(
                "-mb-px px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              )}
              aria-current={active ? "page" : undefined}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <div className="bg-white rounded-xl border border-neutral-200">
        <TaskList
          tasks={tasksWithClient}
          emptyMessage={
            filter === "completed"
              ? "No completed tasks yet."
              : filter === "overdue"
              ? "Nothing overdue — nice."
              : "No upcoming tasks. Add one above."
          }
        />
      </div>
    </div>
  );
}
