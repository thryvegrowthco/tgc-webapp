import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Users, CheckCircle2, Clock, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TaskList, type TaskListItem } from "@/components/admin/TaskList";
import { AddTaskForm } from "@/components/admin/AddTaskForm";
import { UpcomingSessionsWidget } from "@/components/admin/UpcomingSessionsWidget";
import type { AdminTask } from "@/types/database";

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

  // Top 5 open tasks for the home widget.
  const { data: openTasksRaw } = await supabase
    .from("admin_tasks")
    .select("id, title, description, due_at, completed_at, related_booking_id, related_client_id, created_by, created_at")
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(5);
  const openTasks = (openTasksRaw ?? []) as AdminTask[];

  // ── Job Alerts metrics ──────────────────────────────────────────────────
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday).toISOString();

  // Paying subscribers only — a comp is active but earns nothing, so it gets
  // counted separately rather than inflating this tile.
  const { count: activeWatchlist } = await supabase
    .from("watchlist_profiles")
    .select("*", { count: "exact", head: true })
    .eq("subscription_status", "active")
    .eq("access_source", "paid");
  const { count: compedWatchlist } = await supabase
    .from("watchlist_profiles")
    .select("*", { count: "exact", head: true })
    .eq("subscription_status", "active")
    .eq("access_source", "comped");
  const { count: pendingReviewCount } = await supabase
    .from("watchlist_profiles")
    .select("*", { count: "exact", head: true })
    .eq("review_status", "pending_review");
  const { count: inactiveWatchlist } = await supabase
    .from("watchlist_profiles")
    .select("*", { count: "exact", head: true })
    .neq("subscription_status", "active");
  const { count: newMatchesThisWeek } = await supabase
    .from("client_job_matches")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekStart);
  const { count: applicationsTracked } = await supabase
    .from("client_job_matches")
    .select("*", { count: "exact", head: true })
    .eq("status", "applied");
  const { count: unreadMessages } = await supabase
    .from("client_messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_role", "client")
    .is("read_at", null);

  // Pending-review queue (clients who submitted but haven't been reviewed).
  const { data: pendingRaw } = await supabase
    .from("watchlist_profiles")
    .select("client_id, updated_at")
    .eq("review_status", "pending_review")
    .order("updated_at", { ascending: false })
    .limit(6);
  const pendingReview = (pendingRaw ?? []) as { client_id: string | null; updated_at: string }[];

  // Recent activity feed (in-app admin notifications).
  const { data: activityRaw } = await supabase
    .from("admin_notifications")
    .select("id, type, title, body, link, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  const activity = (activityRaw ?? []) as {
    id: string; type: string; title: string; body: string | null; link: string | null; created_at: string;
  }[];

  // Fetch related profiles and slots
  const clientIds = [
    ...new Set([
      ...recentBookings.map((b) => b.client_id),
      ...openTasks.map((t) => t.related_client_id),
      ...pendingReview.map((p) => p.client_id),
    ].filter(Boolean)),
  ] as string[];
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

  const tasksWithClient: TaskListItem[] = openTasks.map((t) => ({
    ...t,
    clientName: t.related_client_id
      ? profileMap[t.related_client_id]?.full_name ?? profileMap[t.related_client_id]?.email ?? null
      : null,
  }));

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

      {/* Quick action: the booking-invitation flow (offer times → client picks → session) */}
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-semibold text-neutral-900">Book a client in</h2>
          <p className="text-sm text-neutral-600 mt-0.5 max-w-xl">
            Hand-pick a few date &amp; time options and email them. When the client picks one, the session is
            created, added to your calendar, and confirmation emails go out — automatically.
          </p>
        </div>
        <Link
          href="/admin/invitations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors whitespace-nowrap"
        >
          <Send className="h-4 w-4" /> Invite a client to book
        </Link>
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

      {/* Job Alerts metrics */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Job Alerts</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <JobMetric
            label="Paying Clients"
            value={activeWatchlist ?? 0}
            href="/admin/clients?sub=active"
            sublabel={(compedWatchlist ?? 0) > 0 ? `+ ${compedWatchlist} comped` : undefined}
          />
          <JobMetric label="Pending Review" value={pendingReviewCount ?? 0} href="/admin/watchlists" highlight={(pendingReviewCount ?? 0) > 0} />
          <JobMetric label="Inactive" value={inactiveWatchlist ?? 0} href="/admin/watchlists" />
          <JobMetric label="New Matches (wk)" value={newMatchesThisWeek ?? 0} href="/admin/watchlists" />
          <JobMetric label="Applications" value={applicationsTracked ?? 0} href="/admin/watchlists" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          <JobMetric label="Unread Messages" value={unreadMessages ?? 0} href="/admin/messages" highlight={(unreadMessages ?? 0) > 0} />
        </div>
      </section>

      {/* Pending review queue */}
      {pendingReview.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h2 className="font-semibold text-neutral-900">Pending review</h2>
            <p className="text-xs text-neutral-400 mt-0.5">New watchlist submissions waiting for your review.</p>
          </div>
          <div className="divide-y divide-neutral-100">
            {pendingReview.map((p) => {
              const profile = p.client_id ? profileMap[p.client_id] : null;
              if (!p.client_id) return null;
              return (
                <Link
                  key={p.client_id}
                  href={`/admin/watchlists/${p.client_id}`}
                  className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-neutral-50"
                >
                  <span className="text-sm font-medium text-neutral-900 truncate">
                    {profile?.full_name ?? profile?.email ?? "Unknown client"}
                  </span>
                  <span className="text-xs text-neutral-400 flex-shrink-0">Review →</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="bg-white rounded-xl border border-neutral-200">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-neutral-900">Top tasks</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Your next 5 open items by due date.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/tasks" className="text-sm text-brand-700 font-medium hover:text-brand-800">
              View all →
            </Link>
          </div>
        </div>
        <div className="px-4 py-2">
          <TaskList
            tasks={tasksWithClient}
            emptyMessage="No open tasks. Add one below to track your next steps."
          />
        </div>
        <div className="px-6 py-4 border-t border-neutral-100">
          <AddTaskForm triggerLabel="Add task" />
        </div>
      </div>

      {/* Upcoming sessions (today + next 7 days) */}
      <UpcomingSessionsWidget />

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

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-neutral-200">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Recent activity</h2>
          <Link href="/admin/notifications" className="text-sm text-brand-700 font-medium hover:text-brand-800">
            View all →
          </Link>
        </div>
        {activity.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-neutral-400">No recent activity.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {activity.map((a) => {
              const row = (
                <div className="px-6 py-3">
                  <p className="text-sm font-medium text-neutral-900">{a.title}</p>
                  {a.body && <p className="text-xs text-neutral-500 mt-0.5">{a.body}</p>}
                  <p className="text-[11px] text-neutral-400 mt-1">
                    {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              );
              return a.link ? (
                <Link key={a.id} href={a.link} className="block hover:bg-neutral-50">{row}</Link>
              ) : (
                <div key={a.id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function JobMetric({
  label,
  value,
  href,
  highlight,
  sublabel,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
  sublabel?: string;
}) {
  return (
    <Link
      href={href}
      className={
        "bg-white rounded-xl border p-5 transition-colors hover:border-brand-200 " +
        (highlight ? "border-amber-300" : "border-neutral-200")
      }
    >
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500 mt-0.5">{label}</p>
      {sublabel && <p className="text-xs text-brand-700 mt-0.5">{sublabel}</p>}
    </Link>
  );
}
