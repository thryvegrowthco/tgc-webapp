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

const STATUS_COPY: Record<string, { label: string; className: string }> = {
  booked: { label: "Booked", className: "bg-yellow-100 text-yellow-700" },
  intake_needed: { label: "Intake needed", className: "bg-yellow-100 text-yellow-700" },
  intake_complete: { label: "Intake complete", className: "bg-blue-100 text-blue-700" },
  session_scheduled: { label: "Session scheduled", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  follow_up_sent: { label: "Wrapped up", className: "bg-neutral-100 text-neutral-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

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
      contract_accepted_at, contract_version, intake_due_at, created_at, slot_id
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.client_id !== user.id) {
    notFound();
  }

  // Job Alerts subscription has its own setup page.
  if (booking.service_key === "job_alerts_monthly") {
    redirect("/dashboard/watchlist/setup");
  }

  const schema = getSchemaForService(booking.service_key);
  if (!schema) {
    notFound();
  }

  // Load existing intake responses (may be null on first visit)
  const { data: intake } = await supabase
    .from("intake_responses")
    .select("responses, submitted_at, last_saved_at")
    .eq("booking_id", bookingId)
    .maybeSingle();

  const statusInfo = STATUS_COPY[booking.workflow_status] ?? STATUS_COPY.booked;
  const sessionAt = booking.session_at ? new Date(booking.session_at) : null;
  const intakeDueAt = booking.intake_due_at ? new Date(booking.intake_due_at) : null;

  const initialResponses = (intake?.responses ?? {}) as IntakeResponses;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/dashboard/bookings" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> All bookings
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
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <IntakeFormRenderer
              schema={schema}
              bookingId={booking.id}
              initialResponses={initialResponses}
              submittedAt={intake?.submitted_at ?? null}
            />
          </div>

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
            </div>
          )}

          {/* Meet link card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-wide mb-2">
              <Video className="h-3.5 w-3.5" />
              Meeting link
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
            ) : booking.meet_link_pending ? (
              <p className="text-sm text-yellow-700 flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                Rachel will send your link soon.
              </p>
            ) : (
              <p className="text-sm text-neutral-500">
                You&apos;ll get the link before our session.
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
