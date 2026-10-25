// Admin queue of sessions. Default view buckets active sessions by
// workflow_status; a filter bar narrows by status and searches client/service.
// Each row links to the full session record on the client detail page.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, AlertCircle, CheckCircle2, Clock, Video, Phone, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowStatus } from "@/types/database";
import { formatCentralDate, formatCentralTime } from "@/lib/time/central";
import { formatDuration, meetingTypeLabel } from "@/lib/booking/display";
import { SessionsFilters } from "@/components/admin/SessionsFilters";
import { NewSessionDialog } from "@/components/admin/NewSessionDialog";
import { SessionEditorDrawer, type ClientOption } from "@/components/admin/SessionEditorDrawer";
import { SERVICES } from "@/lib/stripe/products";

export const metadata: Metadata = {
  title: "Sessions — Admin",
  robots: { index: false, follow: false },
};

const STATUS_ORDER: Array<{
  key: string;
  label: string;
  helperText: string;
}> = [
  { key: "intake_needed", label: "Intake needed", helperText: "Client hasn't completed the intake form yet." },
  { key: "intake_complete", label: "Intake complete", helperText: "Ready for you to review before the session." },
  { key: "session_scheduled", label: "Session scheduled", helperText: "Reviewed and on the calendar." },
  { key: "completed", label: "Completed", helperText: "Session done — follow-up will send automatically." },
  { key: "follow_up_sent", label: "Follow-up sent", helperText: "Fully wrapped up." },
  { key: "rescheduled", label: "Rescheduled", helperText: "Moved to a new time." },
  { key: "no_show", label: "No show", helperText: "Client didn't attend." },
];

const ACTIVE_STATUSES = ["intake_needed", "intake_complete", "session_scheduled"];
const PAYMENT_BADGE: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  refunded: "bg-neutral-100 text-neutral-600",
  waived: "bg-blue-100 text-blue-700",
  not_required: "bg-neutral-100 text-neutral-500",
};

type SessionRow = {
  id: string;
  service_type: string;
  service_key: string | null;
  session_type: string | null;
  workflow_status: string;
  session_at: string | null;
  intake_due_at: string | null;
  meet_link_pending: boolean;
  meet_link: string | null;
  duration_minutes: number;
  location_type: string;
  location_details: string | null;
  payment_status: string;
  amount_cents: number | null;
  admin_notes: string | null;
  client_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  created_at: string;
};

type ProfileRow = { id: string; full_name: string | null; email: string };

function LocationIcon({ type }: { type: string }) {
  if (type === "phone") return <Phone className="h-3 w-3" />;
  if (type === "in_person") return <MapPin className="h-3 w-3" />;
  return <Video className="h-3 w-3" />;
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; include?: string }>;
}) {
  const { status: statusParam, q: qParam, include } = await searchParams;
  // `include=all` kept for backward compatibility with old links.
  const status = statusParam ?? (include === "all" ? "all" : "active");
  const q = (qParam ?? "").trim();
  const filtering = status !== "active" || q.length > 0;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/sessions");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  let query = supabase
    .from("bookings")
    .select(
      "id, service_type, service_key, session_type, workflow_status, session_at, intake_due_at, meet_link_pending, meet_link, duration_minutes, location_type, location_details, payment_status, amount_cents, admin_notes, client_id, guest_name, guest_email, created_at"
    )
    .order("session_at", { ascending: true, nullsFirst: false });

  // Cancelled rows are hidden only in the default "active" view (which already
  // restricts to ACTIVE_STATUSES). "All statuses" and "Cancelled" show them.
  if (status === "active") {
    query = query.in("workflow_status", ACTIVE_STATUSES as WorkflowStatus[]);
  } else if (status !== "all") {
    query = query.eq("workflow_status", status as WorkflowStatus);
  }

  const { data: sessionsRaw } = await query;
  let sessions = (sessionsRaw ?? []) as SessionRow[];

  // Hydrate client info
  const clientIds = [...new Set(sessions.map((s) => s.client_id).filter(Boolean))] as string[];
  let profiles: ProfileRow[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", clientIds);
    profiles = (data ?? []) as ProfileRow[];
  }
  const clientMap = new Map(profiles.map((p) => [p.id, p]));

  // All client accounts — for the "New session" picker and per-row reassign.
  const { data: allClientsRaw } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name", { ascending: true });
  const allClients = (allClientsRaw ?? []) as Array<{
    id: string;
    full_name: string | null;
    email: string;
    role: string;
  }>;
  const clientOptions: ClientOption[] = allClients
    .filter((p) => p.role === "client")
    .map((p) => ({ id: p.id, name: p.full_name ?? "", email: p.email }));

  const servicePresets = Object.entries(SERVICES).map(([key, s]) => ({
    key,
    label: s.name,
    serviceType: s.serviceType,
    amountCents: s.amountCents,
  }));

  // Free-text search on client name/email + service type.
  if (q) {
    const needle = q.toLowerCase();
    sessions = sessions.filter((s) => {
      const c = s.client_id ? clientMap.get(s.client_id) : null;
      return (
        s.service_type.toLowerCase().includes(needle) ||
        (c?.full_name?.toLowerCase().includes(needle) ?? false) ||
        (c?.email?.toLowerCase().includes(needle) ?? false) ||
        (s.guest_name?.toLowerCase().includes(needle) ?? false) ||
        (s.guest_email?.toLowerCase().includes(needle) ?? false)
      );
    });
  }

  const pendingMeetLinks = sessions.filter((s) => s.meet_link_pending && !s.meet_link).length;
  const overdueIntakes = sessions.filter(
    (s) => s.workflow_status === "intake_needed" && s.intake_due_at && new Date(s.intake_due_at) < new Date()
  ).length;

  // Bucket by workflow_status (only used in the default unfiltered view).
  const buckets = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const bucket = buckets.get(s.workflow_status) ?? [];
    bucket.push(s);
    buckets.set(s.workflow_status, bucket);
  }

  function renderRow(row: SessionRow) {
    const client = row.client_id ? clientMap.get(row.client_id) : null;
    const sessionAt = row.session_at ? new Date(row.session_at) : null;
    const intakeOverdue =
      row.workflow_status === "intake_needed" &&
      row.intake_due_at &&
      new Date(row.intake_due_at) < new Date();

    const info = (
      <>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-semibold text-neutral-900 text-sm truncate">
            {client?.full_name || client?.email || row.guest_name || row.guest_email || "Unknown client"}
          </p>
          {!row.client_id && (
            <span className="text-[10px] uppercase tracking-wide bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-semibold">
              No account
            </span>
          )}
          {row.workflow_status === "cancelled" && (
            <span className="text-[10px] uppercase tracking-wide bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">
              Cancelled
            </span>
          )}
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
          <span
            className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold ${
              PAYMENT_BADGE[row.payment_status] ?? PAYMENT_BADGE.not_required
            }`}
          >
            {row.payment_status === "not_required" ? "unpaid" : row.payment_status}
          </span>
        </div>
        <p className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
          <span>{row.service_type}</span>
          <span className="text-neutral-300">·</span>
          <span className="inline-flex items-center gap-1">
            <LocationIcon type={row.location_type} />
            {meetingTypeLabel(row.location_type)}
          </span>
          <span className="text-neutral-300">·</span>
          <span>{formatDuration(row.duration_minutes)}</span>
        </p>
      </>
    );

    return (
      <div
        key={row.id}
        id={`booking-${row.id}`}
        className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all"
      >
        <div className="flex items-center justify-between gap-4">
          {row.client_id ? (
            <Link href={`/admin/clients/${row.client_id}#booking-${row.id}`} className="block min-w-0 flex-1">
              {info}
            </Link>
          ) : (
            <div className="min-w-0 flex-1">{info}</div>
          )}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
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
            <SessionEditorDrawer
              clients={clientOptions}
              booking={{
                id: row.id,
                clientId: row.client_id,
                serviceType: row.service_type,
                sessionType: row.session_type,
                sessionAt: row.session_at,
                durationMinutes: row.duration_minutes,
                locationType: row.location_type,
                locationDetails: row.location_details,
                meetLink: row.meet_link,
                paymentStatus: row.payment_status,
                workflowStatus: row.workflow_status,
                amountCents: row.amount_cents,
                adminNotes: row.admin_notes,
                guestName: row.guest_name,
                guestEmail: row.guest_email,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Sessions</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Your source of truth for every booked session.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SessionsFilters status={status} q={q} />
          <NewSessionDialog clients={clientOptions} servicePresets={servicePresets} />
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
                <p className="text-red-800 mt-0.5">Past the deadline. Consider reaching out personally.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <p className="text-sm text-neutral-500">
            {filtering ? "No sessions match your filters." : "No active sessions right now."}
          </p>
        </div>
      ) : filtering ? (
        // Flat filtered list
        <div className="space-y-2">{sessions.map(renderRow)}</div>
      ) : (
        // Default bucketed view
        <div className="space-y-8">
          {STATUS_ORDER.map((bucket) => {
            const rows = buckets.get(bucket.key) ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={bucket.key}>
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="font-display text-lg font-bold text-neutral-900">{bucket.label}</h2>
                  <span className="text-sm text-neutral-500">
                    {rows.length} {rows.length === 1 ? "session" : "sessions"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-3">{bucket.helperText}</p>
                <div className="space-y-2">{rows.map(renderRow)}</div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
