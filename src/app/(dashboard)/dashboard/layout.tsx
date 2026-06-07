import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import type { ClientNotification } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware handles most cases, but belt-and-suspenders check here
  if (!user) {
    redirect("/login");
  }

  const { data: notifsRaw } = await supabase
    .from("client_notifications")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const notifications = (notifsRaw ?? []) as ClientNotification[];
  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <DashboardNav />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-end gap-2 border-b border-neutral-200 bg-white px-6 py-3">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
