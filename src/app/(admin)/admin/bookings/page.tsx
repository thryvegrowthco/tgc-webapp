import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BulkSlotForm } from "@/components/admin/BulkSlotForm";
import { SlotList } from "@/components/admin/SlotList";
import { WeeklyScheduleEditor } from "@/components/admin/WeeklyScheduleEditor";
import { BlackoutManager } from "@/components/admin/BlackoutManager";
import { UpcomingAvailabilityGrid } from "@/components/admin/UpcomingAvailabilityGrid";
import { getScheduleSnapshot } from "@/app/actions/availability";

export const metadata: Metadata = {
  title: "Bookings — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminBookingsPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  // Recurring schedule snapshot (patterns + blackouts)
  const { patterns, blackouts } = await getScheduleSnapshot();

  // Upcoming unbooked slots
  const { data: openSlots } = await supabase
    .from("availability_slots")
    .select("id, slot_date, start_time, end_time, service_type")
    .eq("is_booked", false)
    .gte("slot_date", today)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Bookings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your availability here.</p>
      </div>

      {/* Sessions hub link — every booked session lives on the Sessions page now */}
      <Link
        href="/admin/sessions"
        className="group flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-brand-50 rounded-lg">
            <CalendarCheck className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900">Sessions</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              View, add, edit, reschedule, or cancel every booked session.
            </p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-brand-600 transition-colors flex-shrink-0" />
      </Link>

      {/* Recurring weekly schedule (primary) */}
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-neutral-900">My weekly schedule</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Set it once. Slots auto-generate 8 weeks ahead and extend daily so clients can always book.
          </p>
        </div>
        <WeeklyScheduleEditor initialPatterns={patterns} />
      </section>

      {/* Blackout dates (vacation / holidays) */}
      <section className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="mb-4">
          <h2 className="font-semibold text-neutral-900">Blackout dates</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Days off: vacation, holidays, conferences. No slots are generated inside these ranges.
          </p>
        </div>
        <BlackoutManager initialBlackouts={blackouts} />
      </section>

      {/* Read-only 4-week preview of what clients will see */}
      <section className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="mb-4">
          <h2 className="font-semibold text-neutral-900">Next 4 weeks: what clients see</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            A glanceable preview of the public booking calendar. Open slots in green, already booked in gray.
          </p>
        </div>
        <UpcomingAvailabilityGrid />
      </section>

      {/* Add availability slots in bulk (legacy one-off feature) */}
      <section className="bg-white rounded-xl border border-neutral-200 p-6">
        <details>
          <summary className="cursor-pointer list-none">
            <span className="font-semibold text-neutral-900">Add one-off slots</span>
            <p className="text-xs text-neutral-400 mt-0.5">
              For irregular blocks that don&apos;t fit your recurring schedule above. Click to expand.
            </p>
          </summary>
          <div className="mt-5">
            <BulkSlotForm />
          </div>
        </details>
      </section>

      {/* Open (unbooked) slots */}
      <section className="bg-white rounded-xl border border-neutral-200">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">Open Slots</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Clients can book these. Delete any you no longer want available.
          </p>
        </div>
        <SlotList slots={openSlots ?? []} />
      </section>
    </div>
  );
}
