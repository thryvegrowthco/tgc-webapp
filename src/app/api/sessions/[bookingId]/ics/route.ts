// GET /api/sessions/[bookingId]/ics
//
// Serves a downloadable RFC 5545 calendar file for a confirmed session.
// Authorized two ways:
//   1. The signed-in owner of the booking (dashboard "Download .ics" button).
//   2. A `?t=` HMAC token (signIcsToken) so the link works straight from an
//      email, with no login.
// Returns 404 for a missing / cancelled / not-yet-scheduled session, and to any
// caller who is neither the owner nor holding a valid token (don't leak existence).

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyIcsToken } from "@/lib/crypto/sign";
import { buildIcs, buildSessionCalendar } from "@/lib/booking/calendar-links";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const token = request.nextUrl.searchParams.get("t");

  const service = createServiceClient();
  const { data: booking } = await service
    .from("bookings")
    .select(
      "id, client_id, service_type, session_at, duration_minutes, location_type, location_details, meet_link, workflow_status, updated_at"
    )
    .eq("id", bookingId)
    .maybeSingle();

  const b = booking as {
    id: string;
    client_id: string | null;
    service_type: string;
    session_at: string | null;
    duration_minutes: number;
    location_type: string;
    location_details: string | null;
    meet_link: string | null;
    workflow_status: string;
    updated_at: string | null;
  } | null;

  if (!b || b.workflow_status === "cancelled" || !b.session_at) {
    return new Response("Not found", { status: 404 });
  }

  // Authorize: valid token, or the signed-in owner of this booking.
  let authorized = verifyIcsToken(bookingId, token);
  if (!authorized) {
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    authorized = !!user && !!b.client_id && b.client_id === user.id;
  }
  if (!authorized) {
    return new Response("Not found", { status: 404 });
  }

  const workspaceUrl = b.client_id ? `${APP_URL}/dashboard/sessions/${b.id}` : null;
  const cal = buildSessionCalendar({
    serviceType: b.service_type,
    sessionAtIso: b.session_at,
    durationMinutes: b.duration_minutes,
    locationType: b.location_type,
    locationDetails: b.location_details,
    meetLink: b.meet_link,
    workspaceUrl,
  });

  const ics = buildIcs({
    uid: `${b.id}@thryvegrowth.co`,
    title: cal.title,
    startIso: cal.startIso,
    endIso: cal.endIso,
    description: cal.details,
    location: cal.location || undefined,
    url: workspaceUrl ?? APP_URL,
    lastModifiedIso: b.updated_at ?? undefined,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="thryve-session.ics"',
      "Cache-Control": "no-store",
    },
  });
}
