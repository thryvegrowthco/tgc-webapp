// Daily admin digest of overdue intakes — anything where workflow_status is
// still `intake_needed` and intake_due_at has passed.
//
// One alert per booking via automation_log idempotency.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resend, FROM_EMAIL } from "@/lib/email/resend";
import { renderShell } from "@/lib/email/shell";
import { isAuthorized, getNowFromRequest } from "@/lib/cron/auth";
import { formatCentralDateTime } from "@/lib/time/central";
import { createAdminNotification } from "@/lib/notifications/admin";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@thryvegrowth.co";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = getNowFromRequest(request);
  const supabase = createServiceClient();

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, client_id, service_type, intake_due_at, session_at")
    .eq("workflow_status", "intake_needed")
    .lt("intake_due_at", now.toISOString());

  type Row = {
    id: string;
    client_id: string | null;
    service_type: string;
    intake_due_at: string | null;
    session_at: string | null;
  };
  const overdue = (bookingsRaw ?? []) as Row[];
  if (overdue.length === 0) {
    return Response.json({ ok: true, overdue: 0 });
  }

  // Find which haven't been alerted yet (one-shot per booking).
  const { data: logged } = await supabase
    .from("automation_log")
    .select("booking_id")
    .eq("event_key", "intake_overdue_alert_sent");
  const alreadyAlerted = new Set((logged ?? []).map((l) => l.booking_id));

  const pending = overdue.filter((b) => !alreadyAlerted.has(b.id));
  if (pending.length === 0) {
    return Response.json({ ok: true, overdue: overdue.length, new_alerts: 0 });
  }

  // Hydrate clients
  const clientIds = [...new Set(pending.map((b) => b.client_id).filter(Boolean))] as string[];
  let profiles: { id: string; full_name: string | null; email: string }[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", clientIds);
    profiles = data ?? [];
  }
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Build a single digest email to Rachel
  const rows = pending.map((b) => {
    const client = b.client_id ? profileMap.get(b.client_id) : null;
    return {
      client: client?.full_name || client?.email || "Unknown client",
      service: b.service_type,
      dueAt: b.intake_due_at ? `${formatCentralDateTime(b.intake_due_at, { dateStyle: "medium", timeStyle: "short" })} CT` : "—",
      sessionAt: b.session_at ? `${formatCentralDateTime(b.session_at, { dateStyle: "medium", timeStyle: "short" })} CT` : "no session",
      url: `${APP_URL}/admin/clients/${b.client_id}#booking-${b.id}`,
    };
  });

  const innerHtml = `
<p style="margin:0 0 16px;">${pending.length} ${pending.length === 1 ? "intake is" : "intakes are"} overdue. The clients haven't completed the intake form past the due date.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 16px;">
  ${rows.map(r => `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:12px 0;">
        <p style="margin:0;font-weight:600;color:#0f172a;">${escapeHtml(r.client)}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#64748b;">${escapeHtml(r.service)} &middot; session ${escapeHtml(r.sessionAt)}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#94a3b8;">Due ${escapeHtml(r.dueAt)}</p>
      </td>
      <td style="text-align:right;padding:12px 0;"><a href="${r.url}" style="color:#203e35;font-weight:600;">Open</a></td>
    </tr>
  `).join("")}
</table>
<p style="margin:0;color:#64748b;font-size:13px;">You may want to reach out to these clients personally.</p>
`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `Overdue intakes — ${pending.length} ${pending.length === 1 ? "client" : "clients"}`,
    html: renderShell(innerHtml),
  });

  // Log one row per booking for idempotency, and mirror the alert into the
  // admin notification feed so Rachel can clear them from the bell, not just
  // her inbox.
  for (const b of pending) {
    await supabase.from("automation_log").upsert(
      {
        event_key: "intake_overdue_alert_sent",
        booking_id: b.id,
        client_id: b.client_id,
        status: "success",
        payload: { intake_due_at: b.intake_due_at },
      },
      { onConflict: "event_key,booking_id" }
    );

    const client = b.client_id ? profileMap.get(b.client_id) : null;
    const clientLabel = client?.full_name || client?.email || "Unknown client";
    await createAdminNotification({
      type: "intake_overdue",
      title: `Intake overdue: ${clientLabel}`,
      body: b.service_type,
      link: `/admin/clients/${b.client_id}#booking-${b.id}`,
      bookingId: b.id,
      clientId: b.client_id,
    });
  }

  return Response.json({ ok: true, overdue: overdue.length, new_alerts: pending.length });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
