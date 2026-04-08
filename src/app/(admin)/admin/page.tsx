import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Users, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin — Thryve Growth Co.",
  robots: { index: false, follow: false },
};

type RecentBooking = {
  id: string;
  service_type: string;
  status: string | null;
  created_at: string;
  amount_cents: number | null;
  client_id: string | null;
  slot_id: string | null;
};

type ProfileRow = { id: string; full_name: string | null; email: string };
type SlotRow = { id: string; slot_date: string };

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  // Run count queries one at a time to avoid Promise.all type inference issues
  // with Supabase's union-column filters
  const { count: totalClients } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .neq("role", "admin"); // avoids narrowing to 'never' vs .eq("role", "client")

  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true });

  const { count: confirmedBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "confirmed");

  const { data: recentRaw } = await supabase
    .from("bookings")
    .select("id, service_type, status, created_at, amount_cents, client_id, slot_id")
    .order("created_at", { ascending: false })
    .limit(10);

  const recentBookings = (recentRaw ?? []) as RecentBooking[];

  // Fetch related profiles and slots
  const clientIds = [...new Set(recentBookings.map((b) => b.client_id).filter(Boolean))] as string[];
  const slotIds = [...new Set(recentBookings.map((b) => b.slot_id).filter(Boolean))] as string[];

  let profiles: ProfileRow[] = [];
  let slots: SlotRow[] = [];

  if (clientIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", clientIds);
    profiles = (data ?? []) as ProfileRow[];
  }
  if (slotIds.length > 0) {
    const { data } = await supabase.from("availability_slots").select("id, slot_date").in("id", slotIds);
    slots = (data ?? []) as SlotRow[];
  }

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const slotMap = Object.fromEntries(slots.map((s) => [s.id, s]));

  const stats = [
    {
      label: "Total Clients",
      value: totalClients ?? 0,
      icon: Users,
      href: "/admin/clients",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Bookings",
      value: totalBookings ?? 0,
      icon: Calendar,
      href: "/admin/bookings",
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      label: "Confirmed",
      value: confirmedBookings ?? 0,
      icon: CheckCircle2,
      href: "/admin/bookings",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Pending",
      value: (totalBookings ?? 0) - (confirmedBookings ?? 0),
      icon: Clock,
      href: "/admin/bookings",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    completed: "bg-neutral-100 text-neutral-600",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Overview</h1>
        <p className="text-sm text-neutral-500 mt-1">Welcome back, Rachel.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-brand-200 transition-colors"
            >
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="text-sm text-neutral-500 mt-0.5">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl border border-neutral-200">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-sm text-brand-700 font-medium hover:text-brand-800">
            View all →
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-neutral-400">
            No bookings yet.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {recentBookings.map((booking) => {
              const profile = booking.client_id ? profileMap[booking.client_id] : null;
              const slot = booking.slot_id ? slotMap[booking.slot_id] : null;
              const statusClass = statusColors[booking.status ?? ""] ?? "bg-neutral-100 text-neutral-600";

              return (
                <div
                  key={booking.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {profile?.full_name ?? profile?.email ?? "Unknown"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {booking.service_type}
                      {slot?.slot_date
                        ? ` · ${new Date(`${slot.slot_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
                      {booking.status}
                    </span>
                    <span className="text-sm font-medium text-neutral-700">
                      ${((booking.amount_cents ?? 0) / 100).toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
