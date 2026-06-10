"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, EyeOff, Pencil, Trash2, Undo2 } from "lucide-react";
import { setTestimonialStatus, deleteTestimonial } from "@/app/actions/testimonials";
import type { TestimonialStatus } from "@/types/database";

interface Props {
  id: string;
  status: TestimonialStatus;
}

export function TestimonialStatusControl({ id, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function change(next: TestimonialStatus, label: string) {
    setBusy(true);
    const res = await setTestimonialStatus(id, next);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(label);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this testimonial permanently?")) return;
    setBusy(true);
    const res = await deleteTestimonial(id);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Testimonial deleted.");
    router.refresh();
  }

  const btn =
    "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== "approved" && (
        <button
          type="button"
          onClick={() => change("approved", "Testimonial approved — now live.")}
          disabled={busy}
          className={`${btn} border-green-200 text-green-700 hover:bg-green-50`}
        >
          <Check className="h-3.5 w-3.5" /> Approve
        </button>
      )}
      {status === "approved" && (
        <button
          type="button"
          onClick={() => change("hidden", "Testimonial hidden.")}
          disabled={busy}
          className={`${btn} border-neutral-200 text-neutral-600 hover:bg-neutral-50`}
        >
          <EyeOff className="h-3.5 w-3.5" /> Hide
        </button>
      )}
      {status === "hidden" && (
        <button
          type="button"
          onClick={() => change("pending", "Moved back to pending.")}
          disabled={busy}
          className={`${btn} border-neutral-200 text-neutral-600 hover:bg-neutral-50`}
        >
          <Undo2 className="h-3.5 w-3.5" /> Unhide
        </button>
      )}
      {status === "pending" && (
        <button
          type="button"
          onClick={() => change("hidden", "Testimonial hidden.")}
          disabled={busy}
          className={`${btn} border-neutral-200 text-neutral-600 hover:bg-neutral-50`}
        >
          <EyeOff className="h-3.5 w-3.5" /> Hide
        </button>
      )}
      <Link
        href={`/admin/testimonials/${id}`}
        className={`${btn} border-neutral-200 text-neutral-600 hover:bg-neutral-50`}
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Link>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className={`${btn} border-neutral-200 text-neutral-400 hover:text-red-600 hover:bg-red-50`}
        aria-label="Delete testimonial"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
