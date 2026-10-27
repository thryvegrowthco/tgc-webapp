import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Video,
  FileText,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSchemaForService } from "@/lib/intake/schemas";
import { IntakeFormRenderer, type IntakeResponses } from "@/components/intake/IntakeFormRenderer";
import { formatCentralDate, formatCentralTime, CENTRAL_TIMEZONE_LABEL } from "@/lib/time/central";
import { meetingTypeLabel, meetingLocationLine, formatDuration, sessionStatusInfo } from "@/lib/booking/display";
import { buildSessionCalendar } from "@/lib/booking/calendar-links";
import { ClientSessionActions } from "@/components/dashboard/ClientSessionActions";
import { AddToCalendarLinks } from "@/components/booking/AddToCalendarLinks";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

export default async function SessionWorkspacePage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/dashboard/sessions/${bookingId}`);

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, client_id, service_type, service_key, status, workflow_status,
      client_notes, session_at, meet_link, meet_link_pending,
      contract_accepted_at, contract_version, intake_due_at, created_at, slot_id,
      duration_minutes, location_type, location_details, session_summary, next_steps
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    notFound();
  }

  if (booking.client_id !== user.id) {
    // An admin who doesn't own this booking followed a client workspace link
    // (e.g. from an email or the confirmed page). Send them to the admin record
    // instead of a 404: the client detail page when there's an account, or the
    // Sessions hub for a no-account session. Everyone else gets a 404.
    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if ((viewerProfile as { role: string } | null)?.role === "admin") {
      redirect(
        booking.client_id
          ? `/admin/clients/${booking.client_id}#booking-${booking.id}`
          : "/admin/sessions"
      );
    }
    notFound();
  }

  // Job Alerts subscription has its own setup page.
  if (booking.service_key === "job_alerts_monthly") {
    redirect("/dashboard/watchlist/setup");
  }

  // Invitation-created sessions may have no intake schema — that's fine, we
  // render a "no prep needed" variant instead of 404'ing.
  const schema = getSchemaForService(booking.service_key);

  // Load existing intake responses (may be null on first visit / no schema)
  const { data: intake } = schema
    ? await supabase
        .from("intake_responses")
        .select("responses, submitted_at, last_saved_at")
        .eq("booking_id", bookingId)
        .maybeSingle()
    : { data: null };

  const statusInfo = sessionStatusInfo(booking.workflow_status);
  const sessionAt = booking.session_at ? new Date(booking.session_at) : null;
  const intakeDueAt = booking.intake_due_at ? new Date(booking.intake_due_at) : null;

  const now = new Date();
  const cutoff24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const isUpcoming =
    sessionAt != null &&
    sessionAt > now &&
    !["cancelled", "completed", "follow_up_sent", "no_show"].includes(booking.workflow_status);
  const canSelfModify = sessionAt != null && sessionAt > cutoff24;

  const initialResponses = (intake?.responses ?? {}) as IntakeResponses;

  // "Add to calendar" links once the session has a confirmed time. The .ics
  // route authorizes the signed-in owner, so no token is needed here.
  const calendar = booking.session_at
    ? buildSessionCalendar({
        serviceType: booking.service_type,
        sessionAtIso: booking.session_at,
        durationMinutes: booking.duration_minutes,
        locationType: booking.location_type,
        locationDetails: booking.location_details,
        meetLink: booking.meet_link,
        workspaceUrl: `${APP_URL}/dashboard/sessions/${booking.id}`,
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/dashboard/sessions" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> All sessions
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold text-neutral-900">{booking.service_type}</h1>
            <p className="text-neutral-500 mt-1 text-sm">
              Booked {new Date(booking.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: intake form (wider) */}
        <div className="lg:col-span-2 space-y-6">
          {schema ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-6">
              <IntakeFormRenderer
                schema={schema}
                bookingId={booking.id}
                initialResponses={initialResponses}
                submittedAt={intake?.submitted_at ?? null}
              />
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl p-6">
              <h2 className="font-semibold text-neutral-900 mb-2">You&apos;re all set</h2>
              <p className="text-sm text-neutral-600">
                No intake form is needed for this session. If there&apos;s anything you&apos;d like
                Rachel to review in advance, send it over via{" "}
                <Link href="/dashboard/messages" className="text-brand-700 hover:underline">
                  messages
                </Link>
                .
              </p>
            </div>
          )}

          {/* Session summary / next steps shared by Rachel after the session */}
          {(booking.session_summary || booking.next_steps) && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
              {booking.session_summary && (
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">Session summary</h3>
                  <p className="text-sm text-neutral-600 whitespace-pre-wrap">{booking.session_summary}</p>
                </div>
              )}
              {booking.next_steps && (
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">Next steps</h3>
                  <p className="text-sm text-neutral-600 whitespace-pre-wrap">{booking.next_steps}</p>
                </div>
              )}
            </div>
          )}

          {/* What to expect */}
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-6">
            <h3 className="font-semibold text-brand-800 mb-3">What to expect</h3>
            <ul className="space-y-2 text-sm text-brand-700">
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>I&apos;ll review your intake responses carefully before we meet.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>You&apos;ll get a reminder 24 hours before our session with the meeting link.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>If something comes up, message me here or reply to any of my emails.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* Session time card */}
          {sessionAt && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-wide mb-2">
                <Calendar className="h-3.5 w-3.5" />
                Session
              </div>
              <p className="font-semibold text-neutral-900">
                {formatCentralDate(sessionAt)}
              </p>
              <p className="text-sm text-neutral-600 mt-1">
                {formatCentralTime(sessionAt)} ({CENTRAL_TIMEZONE_LABEL})
              </p>
              <p className="text-xs text-neutral-400 mt-1">{formatDuration(booking.duration_minutes)}</p>
              {calendar && (
                <AddToCalendarLinks
                  googleUrl={calendar.googleUrl}
                  icsUrl={`/api/sessions/${booking.id}/ics`}
                  className="mt-4 pt-4 border-t border-neutral-200"
                />
              )}
            </div>
          )}

          {/* Manage session (reschedule / cancel) — only while upcoming */}
          {isUpcoming && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-wide mb-2">
                <Calendar className="h-3.5 w-3.5" />
                Manage
              </div>
              {canSelfModify ? (
                <ClientSessionActions bookingId={booking.id} />
              ) : (
                <p className="text-sm text-neutral-500">
                  Need to change this? It&apos;s within 24 hours. Reply to Rachel&apos;s email and she&apos;ll help.
                </p>
              )}
            </div>
          )}

          {/* Meeting / location card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-wide mb-2">
              <Video className="h-3.5 w-3.5" />
              {meetingTypeLabel(booking.location_type)}
            </div>
            {booking.meet_link ? (
              <a
                href={booking.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-700 font-medium text-sm hover:underline break-all"
              >
                Join Google Meet <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              </a>
            ) : booking.location_type !== "google_meet" && meetingLocationLine(booking.location_type, booking.location_details) ? (
              <p className="text-sm text-neutral-700">
                {meetingLocationLine(booking.location_type, booking.location_details)}
              </p>
            ) : booking.meet_link_pending ? (
              <p className="text-sm text-yellow-700 flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                Rachel will send your link soon.
              </p>
            ) : (
              <p className="text-sm text-neutral-500">
                You&apos;ll get the details before our session.
              </p>
            )}
          </div>

          {/* Contract card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-wide mb-2">
              <FileText className="h-3.5 w-3.5" />
              Service agreement
            </div>
            {booking.contract_accepted_at ? (
              <>
                <p className="text-sm text-neutral-700">
                  Accepted {new Date(booking.contract_accepted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <a
                  href="/legal/service-agreement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline mt-1"
                >
                  View agreement <ExternalLink className="h-3 w-3" />
                </a>
              </>
            ) : (
              <p className="text-sm text-neutral-500">Not yet recorded.</p>
            )}
          </div>

          {/* Intake due card (only if not yet submitted) */}
          {!intake?.submitted_at && intakeDueAt && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-yellow-700 text-xs uppercase tracking-wide mb-2">
                <AlertCircle className="h-3.5 w-3.5" />
                Intake due
              </div>
              <p className="font-semibold text-yellow-900 text-sm">
                {formatCentralDate(intakeDueAt)}
              </p>
            </div>
          )}

          {/* Message Rachel card */}
          <Link
            href="/dashboard/messages"
            className="block bg-white border border-neutral-200 rounded-xl p-5 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-wide mb-2">
              <MessageCircle className="h-3.5 w-3.5" />
              Questions?
            </div>
            <p className="text-sm font-medium text-neutral-900">Message Rachel</p>
            <p className="text-xs text-neutral-500 mt-0.5">Get a reply within 1–2 business days.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
