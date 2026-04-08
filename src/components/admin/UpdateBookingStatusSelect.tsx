"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatus } from "@/app/actions/booking";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function UpdateBookingStatusSelect({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState(currentStatus);
  const [updating, setUpdating] = React.useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setUpdating(true);
    await updateBookingStatus(bookingId, newStatus);
    setUpdating(false);
    router.refresh();
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={updating}
      className="text-xs border border-neutral-200 rounded-lg px-2 py-1 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
