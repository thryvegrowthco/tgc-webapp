import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MarkAllReadButton } from "@/components/admin/MarkAllReadButton";
import { NotificationListItem } from "@/components/admin/NotificationListItem";
import type { AdminNotification } from "@/types/database";

export const metadata: Metadata = {
  title: "Notifications — Admin",
  robots: { index: false, follow: false },
};

type Bucket = "Today" | "Yesterday" | "Earlier this week" | "Older";

function bucketFor(iso: string): Bucket {
  const now = new Date();
  const ts = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);
  if (ts >= startOfToday) return "Today";
  if (ts >= startOfYesterday) return "Yesterday";
  if (ts >= startOfWeek) return "Earlier this week";
  return "Older";
}

export default async function AdminNotificationsPage() {
  const supabase = await createClient();

  const { data: notificationsRaw } = await supabase
    .from("admin_notifications")
    .select("id, type, title, body, link, related_booking_id, related_client_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const notifications = (notificationsRaw ?? []) as AdminNotification[];
  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  const grouped = new Map<Bucket, AdminNotification[]>();
  for (const n of notifications) {
    const b = bucketFor(n.created_at);
    if (!grouped.has(b)) grouped.set(b, []);
    grouped.get(b)!.push(n);
  }
  const order: Bucket[] = ["Today", "Yesterday", "Earlier this week", "Older"];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Notifications</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {unreadCount === 0
              ? "You're all caught up."
              : `${unreadCount} unread`}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 px-6 py-12 text-center text-sm text-neutral-500">
          No notifications yet. New bookings and intake activity will show up here.
        </div>
      ) : (
        <div className="space-y-6">
          {order.map((bucket) => {
            const items = grouped.get(bucket);
            if (!items || items.length === 0) return null;
            return (
              <section key={bucket}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 px-1">
                  {bucket}
                </h2>
                <ul className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                  {items.map((n) => (
                    <NotificationListItem key={n.id} notification={n} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-xs text-neutral-400 text-center">
        Showing the most recent 200 notifications.{" "}
        <Link href="/admin" className="text-brand-700 hover:underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
