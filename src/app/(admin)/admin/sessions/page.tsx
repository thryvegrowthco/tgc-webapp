// Admin queue of sessions grouped by workflow_status. Default view excludes
// completed + follow_up_sent + cancelled (use the filter to include them).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCentralDate, formatCentralTime } from "@/lib/time/central";

export const metadata: Metadata = {
  title: "Sessions — Admin",
  robots: { index: false, follow: false },
};

const STATUS_ORDER: Array<{
  key: string;
  label: string;
  helperText: string;
  className: string;
}> = [
  {
    key: "intake_needed",
    label: "Intake needed",
    helperText: "Client hasn't completed the intake form yet.",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  {
    key: "intake_complete",
    label: "Intake complete",
    helperText: "Ready for you to review before the session.",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    key: "session_scheduled",
    label: "Session scheduled",
    helperText: "Reviewed and on the calendar.",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    key: "completed",
    label: "Completed",
    helperText: "Session done — follow-up will send automatically.",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  {
    key: "follow_up_sent",
    label: "Follow-up sent",
    helperText: "Fully wrapped up.",
    className: "bg-neutral-100 text-neutral-600 border-neutral-200",
  },
];

type SessionRow = {
  id: string;
  service_type: string;
  workflow_status: string;
  session_at: string | null;
  intake_due_at: string | null;
  meet_link_pending: boolean;
  meet_link: string | null;
  client_id: string | null;
  created_at: string;
};

type ProfileRow = { id: string; full_name: string | null; email: string };

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ include?: string }>;
}) {
  const { include } = await searchParams;
  const showCompleted = include === "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/sessions");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const me = profile as { role: string } | null;
  if (me?.role !== "admin") redirect("/dashboard");

  // Single query for all open bookings
  let query = supabase
    .from("bookings")
    .select(
      "id, service_type, workflow_status, session_at, intake_due_at, meet_link_pending, meet_link, client_id, created_at"
    )
    .neq("workflow_status", "cancelled")
    .order("session_at", { ascending: true, nullsFirst: false });

  if (!showCompleted) {
    query = query.in("workflow_status", ["intake_needed", "intake_complete", "session_scheduled"]);
  }

  const { data: sessionsRaw } = await query;
  const sessions = (sessionsRaw ?? []) as SessionRow[];

  // Hydrate client info
  const clientIds = [...new Set(sessions.map((s) => s.client_id).filter(Boolean))] as string[];
  let profiles: ProfileRow[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", clientIds);
    profiles = (data ?? []) as ProfileRow[];
  }
  const clientMap = new Map(profiles.map((p) => [p.id, p]));

  // Bucket by workflow_status
  const buckets = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const bucket = buckets.get(s.workflow_status) ?? [];
    bucket.push(s);
    buckets.set(s.workflow_status, bucket);
  }

  const pendingMeetLinks = sessions.filter((s) => s.meet_link_pending && !s.meet_link).length;
  const overdueIntakes = sessions.filter(
    (s) => s.workflow_status === "intake_needed" && s.intake_due_at && new Date(s.intake_due_at) < new Date()
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Sessions</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Bookings grouped by where they are in the onboarding flow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showCompleted ? (
            <Link href="/admin/sessions" className="text-sm text-brand-700 hover:underline">
              Show active only
            </Link>
          ) : (
            <Link href="/admin/sessions?include=all" className="text-sm text-brand-700 hover:underline">
              Show completed
            </Link>
          )}
        </div>
      </div>

      {/* Banners */}
      {(pendingMeetLinks > 0 || overdueIntakes > 0) && (
        <div className="space-y-3 mb-6">
          {pendingMeetLinks > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <AlertCircle className="h-4 w-4 text-yellow-700 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-900">
                  {pendingMeetLinks} {pendingMeetLinks === 1 ? "session needs" : "sessions need"} a meeting link
                </p>
                <p className="text-yellow-800 mt-0.5">
                  Calendar event creation failed. Add the link manually from the client&apos;s detail page.
                </p>
              </div>
            </div>
          )}
          {overdueIntakes > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <Clock className="h-4 w-4 text-red-700 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-red-900">
                  {overdueIntakes} overdue {overdueIntakes === 1 ? "intake" : "intakes"}
                </p>
                <p className="text-red-800 mt-0.5">
                  Past the deadline. Consider reaching out personally.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-8">
        {STATUS_ORDER.map((bucket) => {
          const rows = buckets.get(bucket.key) ?? [];
          if (rows.length === 0 && !showCompleted) return null;
          if (rows.length === 0) return null;

          return (
            <section key={bucket.key}>
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="font-display text-lg font-bold text-neutral-900">{bucket.label}</h2>
                <span className="text-sm text-neutral-500">
                  {rows.length} {rows.length === 1 ? "booking" : "bookings"}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mb-3">{bucket.helperText}</p>
              <div className="space-y-2">
                {rows.map((row) => {
                  const client = row.client_id ? clientMap.get(row.client_id) : null;
                  const sessionAt = row.session_at ? new Date(row.session_at) : null;
                  const intakeOverdue =
                    row.workflow_status === "intake_needed" &&
                    row.intake_due_at &&
                    new Date(row.intake_due_at) < new Date();
                  return (
                    <Link
                      key={row.id}
                      href={`/admin/clients/${row.client_id}#booking-${row.id}`}
                      className="block bg-white border border-neutral-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-neutral-900 text-sm truncate">
                              {client?.full_name || client?.email || "Unknown client"}
                            </p>
                            {intakeOverdue && (
                              <span className="text-[10px] uppercase tracking-wide bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">
                                Overdue
                              </span>
                            )}
                            {row.meet_link_pending && !row.meet_link && (
                              <span className="text-[10px] uppercase tracking-wide bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-semibold">
                                Meet link needed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">{row.service_type}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {sessionAt ? (
                            <p className="text-xs font-medium text-neutral-700 flex items-center justify-end gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatCentralDate(sessionAt, { month: "short", day: "numeric" })}
                              {" · "}
                              {formatCentralTime(sessionAt)}
                            </p>
                          ) : (
                            <p className="text-xs text-neutral-400">No session date</p>
                          )}
                          {row.workflow_status === "intake_complete" && (
                            <p className="text-[10px] text-blue-700 mt-0.5 flex items-center justify-end gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Ready to review
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {sessions.length === 0 && (
          <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
            <p className="text-sm text-neutral-500">No active sessions right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
