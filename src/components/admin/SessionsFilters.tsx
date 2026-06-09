"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

const SELECT_CLASS =
  "h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Active (default)" },
  { value: "all", label: "All statuses" },
  { value: "intake_needed", label: "Intake needed" },
  { value: "intake_complete", label: "Intake complete" },
  { value: "session_scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "follow_up_sent", label: "Follow-up sent" },
  { value: "no_show", label: "No show" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "cancelled", label: "Cancelled" },
];

export function SessionsFilters({
  status,
  q,
}: {
  status: string;
  q: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(q);

  function pushParams(next: { status?: string; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextStatus = next.status ?? status;
    const nextQ = next.q ?? search;
    if (nextStatus && nextStatus !== "active") params.set("status", nextStatus);
    else params.delete("status");
    if (nextQ.trim()) params.set("q", nextQ.trim());
    else params.delete("q");
    router.push(`/admin/sessions?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q: search });
        }}
        className="relative"
      >
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client or service…"
          className="h-9 w-56 rounded-md border border-neutral-200 bg-white pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </form>
      <select
        value={status}
        onChange={(e) => pushParams({ status: e.target.value })}
        className={SELECT_CLASS}
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
