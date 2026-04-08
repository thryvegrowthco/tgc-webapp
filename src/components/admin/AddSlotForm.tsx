"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addAvailabilitySlot } from "@/app/actions/booking";

const SERVICE_TYPES = [
  { value: "", label: "Any service" },
  { value: "Coaching", label: "Coaching" },
  { value: "Interview Prep", label: "Interview Prep" },
  { value: "Resume Materials", label: "Resume Materials" },
  { value: "HR Consulting", label: "HR Consulting" },
  { value: "Culture Engagement", label: "Culture Engagement" },
];

export function AddSlotForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await addAvailabilitySlot(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      formRef.current?.reset();
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="slotDate">Date <span className="text-red-500">*</span></Label>
          <Input
            id="slotDate"
            name="slotDate"
            type="date"
            required
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="startTime">Start Time <span className="text-red-500">*</span></Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="endTime">End Time <span className="text-red-500">*</span></Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="serviceType">Service (optional)</Label>
          <select
            id="serviceType"
            name="serviceType"
            className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {SERVICE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          Slot added successfully.
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add Slot"}
      </Button>
    </form>
  );
}
