import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Calendar, Video } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCentralDate, formatCentralTime } from "@/lib/time/central";
import { meetingTypeLabel, meetingLocationLine, formatDuration } from "@/lib/booking/display";

export const metadata: Metadata = {
  title: "Your Thryve Session is Confirmed",
  robots: { index: false, follow: false },
};

export default async function ConfirmedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: invRaw } = await supabase
    .from("booking_invitations")
    .select("booking_id, service_type, duration_minutes, location_type, location_details, client_id")
    .eq("token", token)
    .maybeSingle();
  const inv = invRaw as {
    booking_id: string | null;
    service_type: string;
    duration_minutes: number;
    location_type: string;
    location_details: string | null;
    client_id: string | null;
  } | null;

  let sessionAt: string | null = null;
  let meetLink: string | null = null;
  if (inv?.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("session_at, meet_link")
      .eq("id", inv.booking_id)
      .maybeSingle();
    sessionAt = (booking as { session_at: string | null } | null)?.session_at ?? null;
    meetLink = (booking as { meet_link: string | null } | null)?.meet_link ?? null;
  }

  const whereLine = inv ? meetingLocationLine(inv.location_type, inv.location_details) : "";

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-6 w-6 text-green-600" />
      </div>
      <h1 className="font-display text-2xl font-bold text-neutral-900">You&apos;re officially scheduled!</h1>
      <p className="text-neutral-600 mt-2">
        A confirmation email is on its way with everything you need.
      </p>

      {inv && (
        <div className="mt-6 text-left rounded-xl border border-neutral-200 bg-muted/40 p-5 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Service</p>
            <p className="text-sm font-medium text-neutral-900">{inv.service_type}</p>
          </div>
          {sessionAt && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-neutral-400 mt-0.5" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">When</p>
                <p className="text-sm font-medium text-neutral-900">
                  {formatCentralDate(sessionAt)} at {formatCentralTime(sessionAt)} (CT)
                </p>
                <p className="text-xs text-neutral-500">{formatDuration(inv.duration_minutes)}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Video className="h-4 w-4 text-neutral-400 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                {meetingTypeLabel(inv.location_type)}
              </p>
              {meetLink ? (
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-brand-700 hover:underline break-all"
                >
                  Join Google Meet
                </a>
              ) : whereLine ? (
                <p className="text-sm font-medium text-neutral-900">{whereLine}</p>
              ) : (
                <p className="text-sm text-neutral-500">Rachel will share the details before your session.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {inv?.client_id && inv.booking_id ? (
          <Link
            href={`/dashboard/sessions/${inv.booking_id}`}
            className="inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Open your session workspace
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-block text-sm text-brand-700 hover:underline"
          >
            Back to Thryve Growth Co.
          </Link>
        )}
      </div>
    </div>
  );
}
