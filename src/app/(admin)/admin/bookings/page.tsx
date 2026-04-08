import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AddSlotForm } from "@/components/admin/AddSlotForm";
import { SlotList } from "@/components/admin/SlotList";

interface BookingRow {
  id: string;
  service_type: string;
  status: string | null;
  amount_cents: number | null;
  client_notes: string | null;
  client_id: string | null;
  slot_id: string | null;
  created_at: string;
}

export const metadata: Metadata = {
  title: "Bookings — Admin",
  robots: { index: false, follow: false },
};

function formatTimeShort(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}

export default async function AdminBookingsPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  // Upcoming unbooked slots
  const { data: openSlots } = await supabase
    .from("availability_slots")
    .select("id, slot_date, start_time, end_time, service_type")
    .eq("is_booked", false)
    .gte("slot_date", today)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  // Recent confirmed/pending bookings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookingsRaw } = await (supabase as any)
    .from("bookings")
    .select("id, service_type, status, amount_cents, client_notes, client_id, slot_id, created_at")
    .in("status", ["confirmed", "pending"])
    .order("created_at", { ascending: false })
    .limit(50);
  const bookings = bookingsRaw as BookingRow[] | null;

  // Fetch related profiles and slots for those bookings
  const clientIds = [...new Set((bookings ?? []).map((b) => b.client_id).filter(Boolean))] as string[];
  const slotIds = [...new Set((bookings ?? []).map((b) => b.slot_id).filter(Boolean))] as string[];

  type ProfileRow = { id: string; full_name: string | null; email: string };
  type SlotRow = { id: string; slot_date: string; start_time: string };

  let profiles: ProfileRow[] = [];
  let slots: SlotRow[] = [];

  if (clientIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", clientIds);
    profiles = (data ?? []) as ProfileRow[];
  }
  if (slotIds.length > 0) {
    const { data } = await supabase.from("availability_slots").select("id, slot_date, start_time").in("id", slotIds);
    slots = (data ?? []) as SlotRow[];
  }

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const slotMap = Object.fromEntries(slots.map((s) => [s.id, s]));

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Bookings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage availability and view incoming bookings.</p>
      </div>

      {/* Add availability slot */}
      <section className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="font-semibold text-neutral-900 mb-5">Add Availability Slot</h2>
        <AddSlotForm />
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

      {/* Booked sessions */}
      <section className="bg-white rounded-xl border border-neutral-200">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">Upcoming Sessions</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Confirmed and pending bookings.</p>
        </div>

        {!bookings || bookings.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-neutral-400">
            No upcoming sessions.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {bookings.map((booking) => {
              const profile = booking.client_id ? profileMap[booking.client_id] : null;
              const slot = booking.slot_id ? slotMap[booking.slot_id] : null;
              const statusClass = statusColors[booking.status ?? ""] ?? "bg-neutral-100 text-neutral-600";

              return (
                <div key={booking.id} className="px-6 py-4 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {profile?.full_name ?? profile?.email ?? "Unknown client"}
                      </p>
                      <p className="text-xs text-neutral-500">{profile?.email}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusClass}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                    <span>{booking.service_type}</span>
                    {slot?.slot_date && (
                      <span>
                        {new Date(`${slot.slot_date}T00:00:00`).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {formatTimeShort(slot.start_time)}
                      </span>
                    )}
                    <span>${((booking.amount_cents ?? 0) / 100).toFixed(0)}</span>
                  </div>
                  {booking.client_notes && (
                    <p className="text-xs text-neutral-400 italic">
                      &ldquo;{booking.client_notes}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
