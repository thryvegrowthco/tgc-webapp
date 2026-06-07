import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationToggle } from "@/components/admin/NotificationToggle";
import type { NotificationSetting } from "@/types/database";

export const metadata: Metadata = {
  title: "Settings — Admin",
  robots: { index: false, follow: false },
};

const CHANNEL_LABEL: Record<string, string> = { email: "Email", bell: "Bell" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/settings");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  const { data: rowsRaw } = await supabase
    .from("notification_settings")
    .select("*")
    .order("sort_order", { ascending: true });
  const rows = (rowsRaw ?? []) as NotificationSetting[];

  const masters = Object.fromEntries(
    rows.filter((r) => r.channel === "all").map((r) => [r.audience, r])
  ) as Record<string, NotificationSetting | undefined>;

  // Group the per-event rows by audience → event (insertion order = sort_order).
  function eventsFor(audience: "admin" | "client") {
    const groups = new Map<string, NotificationSetting[]>();
    for (const r of rows) {
      if (r.audience !== audience || r.channel === "all") continue;
      const list = groups.get(r.event) ?? [];
      list.push(r);
      groups.set(r.event, list);
    }
    return [...groups.values()];
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Turn notifications on or off — for you (admin) and for leads/clients, per channel. Essential
          messages (payment receipts, welcome, intake confirmations, deliverables, session reminders, and
          login emails) always send and aren&apos;t listed here.
        </p>
      </div>

      <NotificationSection
        title="Admin notifications"
        subtitle="Alerts sent to you about inbound activity."
        master={masters.admin}
        events={eventsFor("admin")}
      />

      <div className="mt-12">
        <NotificationSection
          title="Client & lead notifications"
          subtitle="Messages sent to leads, subscribers, and clients."
          master={masters.client}
          events={eventsFor("client")}
        />
      </div>
    </div>
  );
}

function NotificationSection({
  title,
  subtitle,
  master,
  events,
}: {
  title: string;
  subtitle: string;
  master: NotificationSetting | undefined;
  events: NotificationSetting[][];
}) {
  const masterOff = master ? !master.enabled : false;

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-neutral-900">{title}</h2>
        <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
      </div>

      {master && (
        <div className="bg-white rounded-xl border border-neutral-200 px-5 py-4 flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900">{master.label}</p>
            {master.description && <p className="text-xs text-neutral-500 mt-0.5">{master.description}</p>}
          </div>
          <NotificationToggle settingKey={master.key} enabled={master.enabled} label={master.label} />
        </div>
      )}

      {masterOff && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          The master switch is off — everything in this section is paused regardless of the toggles below.
        </p>
      )}

      <div className="space-y-2">
        {events.map((channels) => {
          const first = channels[0];
          return (
            <div
              key={first.event + first.audience}
              className="bg-white rounded-xl border border-neutral-200 px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{first.label}</p>
                {first.description && <p className="text-xs text-neutral-500 mt-0.5">{first.description}</p>}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                {channels.map((c) => (
                  <div key={c.key} className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 w-9 text-right">{CHANNEL_LABEL[c.channel]}</span>
                    <NotificationToggle settingKey={c.key} enabled={c.enabled} label={`${first.label} (${CHANNEL_LABEL[c.channel]})`} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
