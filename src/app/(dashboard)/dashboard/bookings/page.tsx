import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

const statusStyles: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-neutral-100 text-neutral-600",
  cancelled: "bg-red-100 text-red-700",
};

type BookingRow = {
  id: string;
  service_type: string;
  status: string;
  client_notes: string | null;
  slot_id: string | null;
  created_at: string;
};

type SlotRow = { id: string; slot_date: string; start_time: string };

export default async function BookingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, service_type, status, client_notes, slot_id, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const bookings = (bookingsRaw ?? []) as BookingRow[];

  // Fetch slots for bookings that have one
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Bookings</h1>
          <p className="text-neutral-500 mt-1 text-sm">Your sessions with Rachel.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/book">
            <Calendar className="h-4 w-4" /> Book a Session
          </Link>
        </Button>
      </div>

      {bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const slot = booking.slot_id ? slotMap[booking.slot_id] ?? null : null;
            const statusStyle = statusStyles[booking.status as BookingStatus] ?? "bg-neutral-100 text-neutral-600";
            return (
              <div
                key={booking.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-brand-50 rounded-lg flex-shrink-0">
                    <Calendar className="h-4 w-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 text-sm">{booking.service_type}</p>
                    {slot ? (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {new Date(`${slot.slot_date}T00:00:00`).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "long",
                          day: "numeric",
                        })}
                        {" · "}
                        {slot.start_time}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Requested {new Date(booking.created_at).toLocaleDateString()}
                      </p>
                    )}
                    {booking.client_notes && (
                      <p className="text-xs text-neutral-500 mt-1 italic">
                        &ldquo;{booking.client_notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${statusStyle}`}>
                  {booking.status}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-5 w-5 text-brand-600" />
          </div>
          <h3 className="font-display font-bold text-neutral-900 mb-2">No bookings yet</h3>
          <p className="text-sm text-neutral-500 mb-5">
            Ready to get started? Book a call with Rachel.
          </p>
          <Button asChild>
            <Link href="/book">
              Book a Session <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
