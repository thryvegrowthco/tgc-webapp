"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateLeadStatus } from "@/app/actions/leads";

const OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export function LeadStatusSelect({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setPending(true);
    await updateLeadStatus(leadId, next);
    router.refresh();
    setPending(false);
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={onChange}
      disabled={pending}
      className="text-xs font-semibold rounded-md border border-neutral-200 bg-white px-2 py-1 text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
