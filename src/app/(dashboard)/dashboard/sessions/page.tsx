import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { sessionStatusInfo, sessionWhenLine } from "@/lib/booking/display";

type BookingRow = {
  id: string;
  service_type: string;
  workflow_status: string;
  session_at: string | null;
  slot_id: string | null;
  created_at: string;
};

type SlotRow = { id: string; slot_date: string; start_time: string };

// A session is "past" once it is in a terminal workflow state or its scheduled
// moment is behind us. Everything else is "upcoming" (including undated
// sessions still waiting on a time).
const TERMINAL_STATUSES = new Set(["completed", "follow_up_sent", "cancelled", "no_show"]);

export default async function SessionsListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, service_type, workflow_status, session_at, slot_id, created_at")
    .eq("client_id", user.id);
  const bookings = (bookingsRaw ?? []) as BookingRow[];

  // Slots for date-only bookings that never got a concrete session_at.
  const slotIds = [...new Set(bookings.map((b) => b.slot_id).filter(Boolean))] as string[];
  let slots: SlotRow[] = [];
  if (slotIds.length > 0) {
    const { data } = await supabase
      .from("availability_slots")
      .select("id, slot_date, start_time")
      .in("id", slotIds);
    slots = (data ?? []) as SlotRow[];
  }
  const slotMap = Object.fromEntries(slots.map((s) => [s.id, s]));

  const now = new Date().getTime();
  const isPast = (b: BookingRow) =>
    TERMINAL_STATUSES.has(b.workflow_status) ||
    (b.session_at != null && new Date(b.session_at).getTime() < now);
  const timeOf = (b: BookingRow) =>
    b.session_at ? new Date(b.session_at).getTime() : new Date(b.created_at).getTime();

  const upcoming = bookings
    .filter((b) => !isPast(b))
    .sort((a, b) => {
      // Soonest first; undated "time to be confirmed" sessions sink to the end.
      if (a.session_at && b.session_at) return timeOf(a) - timeOf(b);
      if (a.session_at) return -1;
      if (b.session_at) return 1;
      return timeOf(b) - timeOf(a);
    });
  const past = bookings.filter(isPast).sort((a, b) => timeOf(b) - timeOf(a));

  function renderRow(b: BookingRow) {
    const statusInfo = sessionStatusInfo(b.workflow_status);
    const slot = b.slot_id ? slotMap[b.slot_id] ?? null : null;
    return (
      <Link
        key={b.id}
        href={`/dashboard/sessions/${b.id}`}
        className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between gap-4 hover:border-brand-300 hover:shadow-sm transition-all"
      >
        <div className="flex items-start gap-4 min-w-0">
          <div className="p-2.5 bg-brand-50 rounded-lg flex-shrink-0">
            <Calendar className="h-4 w-4 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900 text-sm truncate">{b.service_type}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{sessionWhenLine(b.session_at, slot)}</p>
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusInfo.className}`}
        >
          {statusInfo.label}
        </span>
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">My Sessions</h1>
          <p className="text-neutral-500 mt-1 text-sm">Your sessions with Rachel.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/book">
            <Calendar className="h-4 w-4" /> Book a Session
          </Link>
        </Button>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <EmptyState
            icon={Calendar}
            title="No sessions yet"
            description="Ready to get started? Book a call with Rachel."
            action={
              <Button asChild>
                <Link href="/book">
                  Book a Session <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">Upcoming</h2>
              <div className="space-y-3">{upcoming.map(renderRow)}</div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">Past</h2>
              <div className="space-y-3">{past.map(renderRow)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
