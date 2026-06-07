import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resend, FROM_EMAIL } from "@/lib/email/resend";
import { isNotificationDisabled } from "@/lib/notifications/settings";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 200;
const MAX_NOTES_LENGTH = 4000;

const REMOTE_VALUES = new Set(["remote", "hybrid", "onsite", "any"]);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;

  const fullName = typeof raw.fullName === "string" ? raw.fullName.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";

  if (!fullName || fullName.length > MAX_FIELD_LENGTH) {
    return NextResponse.json({ ok: false, error: "Full name is required" }, { status: 400 });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
  }

  const phone = trimOrNull(raw.phone, MAX_FIELD_LENGTH);
  const currentPosition = trimOrNull(raw.currentPosition, MAX_FIELD_LENGTH);
  const targetRole = trimOrNull(raw.targetRole, MAX_FIELD_LENGTH);
  const location = trimOrNull(raw.location, MAX_FIELD_LENGTH);
  const remoteRaw = trimOrNull(raw.remotePreference, 20);
  const remotePreference = remoteRaw && REMOTE_VALUES.has(remoteRaw)
    ? (remoteRaw as "remote" | "hybrid" | "onsite" | "any")
    : null;
  const timeline = trimOrNull(raw.timeline, MAX_FIELD_LENGTH);
  const notes = trimOrNull(raw.notes, MAX_NOTES_LENGTH);

  const supabase = createServiceClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      full_name: fullName,
      email,
      phone,
      current_position: currentPosition,
      target_role: targetRole,
      location,
      remote_preference: remotePreference,
      timeline,
      notes,
      source: "job_watchlist",
      status: "new",
    })
    .select("id")
    .single();

  if (error || !lead) {
    console.error("[/api/leads] insert failed:", error);
    return NextResponse.json(
      { ok: false, error: "Couldn't save your info. Please try again." },
      { status: 500 }
    );
  }

  // Notify Rachel + send the lead a thank-you (best-effort, don't block)
  void notifyRachel({ fullName, email, phone, currentPosition, targetRole, location, timeline, notes });
  void thankLead({ fullName, email });

  return NextResponse.json({ ok: true });
}

function trimOrNull(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

async function notifyRachel(data: {
  fullName: string;
  email: string;
  phone: string | null;
  currentPosition: string | null;
  targetRole: string | null;
  location: string | null;
  timeline: string | null;
  notes: string | null;
}) {
  if (await isNotificationDisabled("admin_email:job_watchlist_lead")) return;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: "hello@thryvegrowth.co",
      replyTo: data.email,
      subject: `New Job Watchlist Lead: ${data.fullName}`,
      html: `
        <h2 style="font-family: system-ui, sans-serif;">New lead from /services/job-alerts</h2>
        <table style="font-family: system-ui, sans-serif; font-size: 14px;">
          <tr><td><strong>Name:</strong></td><td>${escapeHtml(data.fullName)}</td></tr>
          <tr><td><strong>Email:</strong></td><td>${escapeHtml(data.email)}</td></tr>
          ${data.phone ? `<tr><td><strong>Phone:</strong></td><td>${escapeHtml(data.phone)}</td></tr>` : ""}
          ${data.currentPosition ? `<tr><td><strong>Current role:</strong></td><td>${escapeHtml(data.currentPosition)}</td></tr>` : ""}
          ${data.targetRole ? `<tr><td><strong>Target role:</strong></td><td>${escapeHtml(data.targetRole)}</td></tr>` : ""}
          ${data.location ? `<tr><td><strong>Location:</strong></td><td>${escapeHtml(data.location)}</td></tr>` : ""}
          ${data.timeline ? `<tr><td><strong>Timeline:</strong></td><td>${escapeHtml(data.timeline)}</td></tr>` : ""}
        </table>
        ${data.notes ? `<p><strong>Notes:</strong></p><p style="white-space:pre-wrap;">${escapeHtml(data.notes)}</p>` : ""}
        <p style="font-family: system-ui, sans-serif; font-size: 13px; color: #475569;">
          Manage in <a href="https://thryvegrowth.co/admin/leads">/admin/leads</a>.
        </p>
      `,
    });
  } catch (err) {
    console.error("[/api/leads] notify Rachel failed:", err);
  }
}

async function thankLead(data: { fullName: string; email: string }) {
  if (await isNotificationDisabled("client_email:lead_thankyou")) return;
  try {
    const firstName = data.fullName.split(" ")[0] ?? "there";
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Thanks for reaching out about Job Watchlist",
      html: `
        <div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <p>Hi ${escapeHtml(firstName)},</p>
          <p>Thanks for sharing what you&apos;re looking for. I&apos;ll personally review your info and reach out within 1&ndash;2 business days to talk through next steps and see if Job Watchlist is the right fit for you.</p>
          <p>If you have questions in the meantime, just reply to this email.</p>
          <p>Talk soon,<br>Rachel<br><span style="color:#475569;">Founder, Thryve Growth Co.</span></p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[/api/leads] thank lead failed:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
