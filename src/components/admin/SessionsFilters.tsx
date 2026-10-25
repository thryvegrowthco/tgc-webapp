"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

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

// ~300ms after the admin stops typing we push the query to the URL. Pressing
// Enter or clearing the box routes immediately. The status filter is always
// preserved so searching never drops the chosen status.
const DEBOUNCE_MS = 300;

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

  // Keep the input in sync when the committed query changes elsewhere
  // (browser back/forward, a cleared filter, etc.).
  React.useEffect(() => {
    setSearch(q);
  }, [q]);

  const buildHref = React.useCallback(
    (next: { status?: string; q?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextStatus = next.status ?? status;
      const nextQ = (next.q ?? search).trim();
      if (nextStatus && nextStatus !== "active") params.set("status", nextStatus);
      else params.delete("status");
      if (nextQ) params.set("q", nextQ);
      else params.delete("q");
      return `/admin/sessions?${params.toString()}`;
    },
    [searchParams, status, search]
  );

  // Debounced live search. Skips the no-op case (input already matches the URL)
  // so typing then settling doesn't push a redundant navigation, and the empty
  // string restores the full list.
  React.useEffect(() => {
    if (search.trim() === q.trim()) return;
    const timer = setTimeout(() => {
      router.push(buildHref({ q: search }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, q, buildHref, router]);

  function clearSearch() {
    setSearch("");
    router.push(buildHref({ q: "" }));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(buildHref({ q: search }));
        }}
        className="relative"
      >
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client or service…"
          aria-label="Search sessions"
          className="h-9 w-56 rounded-md border border-neutral-200 bg-white pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
      <select
        value={status}
        onChange={(e) => router.push(buildHref({ status: e.target.value }))}
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
