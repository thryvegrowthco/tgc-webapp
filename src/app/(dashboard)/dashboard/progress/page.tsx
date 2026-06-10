import { redirect } from "next/navigation";
import { Target, NotebookPen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCentralDate } from "@/lib/time/central";
import { GoalsManager } from "@/components/dashboard/GoalsManager";
import type { ClientGoal } from "@/types/database";

export const metadata = { title: "Progress — Thryve Growth Co." };

type TimelineRow = {
  id: string;
  service_type: string;
  session_at: string | null;
  completed_at: string | null;
  session_summary: string | null;
  next_steps: string | null;
};

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/progress");

  const [{ data: goalRows }, { data: bookingRows }] = await Promise.all([
    supabase
      .from("client_goals")
      .select("id, client_id, title, detail, status, target_date, created_by, created_at, updated_at")
      .eq("client_id", user.id),
    supabase
      .from("bookings")
      .select("id, service_type, session_at, completed_at, session_summary, next_steps")
      .eq("client_id", user.id)
      .order("session_at", { ascending: false, nullsFirst: false }),
  ]);

  const goals = (goalRows ?? []) as ClientGoal[];
  // Only sessions that actually have a recap to show.
  const timeline = ((bookingRows ?? []) as TimelineRow[]).filter(
    (b) => b.session_summary?.trim() || b.next_steps?.trim()
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-neutral-900">Your Progress</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Track what you&apos;re working toward and look back on what each session covered.
        </p>
      </div>

      {/* Goals */}
      <section className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-lg font-bold text-neutral-900">Goals</h2>
        </div>
        <GoalsManager clientId={user.id} goals={goals} />
      </section>

      {/* Session timeline */}
      <section className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <NotebookPen className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-lg font-bold text-neutral-900">Session history</h2>
        </div>

        {timeline.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Once you&apos;ve had a session, Rachel&apos;s recap and next steps will show up here.
          </p>
        ) : (
          <ol className="relative border-l border-neutral-200 ml-2 space-y-6">
            {timeline.map((b) => (
              <li key={b.id} className="ml-5">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-brand-500 border-2 border-white" aria-hidden />
                <p className="text-sm font-semibold text-neutral-900">{b.service_type}</p>
                {b.session_at && (
                  <p className="text-xs text-neutral-400 mb-2">
                    {formatCentralDate(b.session_at, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
                {b.session_summary?.trim() && (
                  <div className="mb-2">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">Summary</p>
                    <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{b.session_summary}</p>
                  </div>
                )}
                {b.next_steps?.trim() && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">Next steps</p>
                    <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{b.next_steps}</p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
