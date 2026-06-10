import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationBell } from "@/components/admin/NotificationBell";
import type { AdminNotification } from "@/types/database";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check admin role — middleware catches most cases, but verify here too
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role: string } | null;

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  // Bell data: 20 most recent + unread count. Polled by the client every 60s
  // via router.refresh(), which re-runs this query.
  const [
    { data: notificationsRaw },
    { count: unreadCount },
  ] = await Promise.all([
    supabase
      .from("admin_notifications")
      .select("id, type, title, body, link, related_booking_id, related_client_id, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .is("read_at", null),
  ]);
  const notifications = (notificationsRaw ?? []) as AdminNotification[];

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AdminNav />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-end gap-2 h-12 px-4 lg:px-6 border-b border-neutral-200 bg-white print:hidden">
          <NotificationBell notifications={notifications} unreadCount={unreadCount ?? 0} />
        </header>
        <main className="flex-1 p-6 lg:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
