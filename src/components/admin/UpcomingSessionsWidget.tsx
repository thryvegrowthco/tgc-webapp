// Admin dashboard widget: sessions happening today + the next 7 days, with
// quick actions. Self-contained server component (does its own fetch) so the
// overview page stays lean.

import Link from "next/link";
import { Calendar, Video, Phone, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCentralDate, formatCentralTime, CENTRAL_TIMEZONE } from "@/lib/time/central";
import { meetingTypeLabel } from "@/lib/booking/display";
import { SessionQuickActions } from "@/components/admin/SessionQuickActions";

type Row = {
  id: string;
  service_type: string;
  session_at: string;
  workflow_status: string;
  location_type: string;
  meet_link_pending: boolean;
  meet_link: string | null;
  client_id: string | null;
};

function todayKeyCentral(d: Date): string {
  // YYYY-MM-DD in Central, for "is this today" comparison.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CENTRAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function LocIcon({ type }: { type: string }) {
  if (type === "phone") return <Phone className="h-3 w-3" />;
  if (type === "in_person") return <MapPin className="h-3 w-3" />;
  return <Video className="h-3 w-3" />;
}

export async function UpcomingSessionsWidget() {
  const supabase = await createClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: rowsRaw } = await supabase
    .from("bookings")
    .select("id, service_type, session_at, workflow_status, location_type, meet_link_pending, meet_link, client_id")
    .in("workflow_status", ["intake_needed", "intake_complete", "session_scheduled"])
    .gte("session_at", now.toISOString())
    .lte("session_at", horizon.toISOString())
    .order("session_at", { ascending: true })
    .limit(12);
  const rows = (rowsRaw ?? []) as Row[];

  const clientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean))] as string[];
  let profiles: { id: string; full_name: string | null; email: string }[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", clientIds);
    profiles = data ?? [];
  }
  const clientMap = new Map(profiles.map((p) => [p.id, p]));
  const todayKey = todayKeyCentral(now);

  return (
    <section className="bg-white rounded-xl border border-neutral-200">
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-900">Upcoming sessions</h2>
        <Link href="/admin/sessions" className="text-sm text-brand-700 font-medium hover:text-brand-800">
          All sessions →
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-neutral-500">
          No sessions in the next 7 days.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {rows.map((row) => {
            const client = row.client_id ? clientMap.get(row.client_id) : null;
            const isToday = todayKeyCentral(new Date(row.session_at)) === todayKey;
            return (
              <li key={row.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <Link
                  href={
                    row.client_id
                      ? `/admin/clients/${row.client_id}#booking-${row.id}`
                      : "/admin/sessions"
                  }
                  className="min-w-0 flex-1 group"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-brand-700">
                      {client?.full_name || client?.email || "Unknown client"}
                    </p>
                    {isToday && (
                      <span className="text-[10px] uppercase tracking-wide bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-semibold">
                        Today
                      </span>
                    )}
                    {row.meet_link_pending && !row.meet_link && (
                      <span className="text-[10px] uppercase tracking-wide bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-semibold">
                        Meet link needed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {formatCentralDate(row.session_at, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                    {formatCentralTime(row.session_at)}
                    <span className="text-neutral-300">·</span>
                    <LocIcon type={row.location_type} />
                    {meetingTypeLabel(row.location_type)}
                  </p>
                </Link>
                <SessionQuickActions bookingId={row.id} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
