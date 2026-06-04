"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTemplated } from "@/lib/email/render";
import { sendAdminBookingAlert } from "@/lib/email/resend";
import { getSchemaForService, validateResponses } from "@/lib/intake/schemas";
import { formatCentralDate, formatCentralTime } from "@/lib/time/central";
import { createAdminNotification } from "@/lib/notifications/admin";
import type { Json } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

interface IntakeSubmitArgs {
  bookingId: string;
  responses: Record<string, unknown>;
  /** True when the client clicked Submit (vs auto-save). */
  submit: boolean;
}

/**
 * Walk the intake `responses` JSONB and collect every filename the client
 * uploaded. Matches the file-shape produced by `IntakeFormView`: each upload
 * is stored as `{ path, filename }` (or an array of those for multi-upload
 * fields). Unknown shapes are skipped.
 */
function collectUploadedFilenames(responses: Record<string, unknown>): string[] {
  const out: string[] = [];
  const visit = (value: unknown): void => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const v of value) visit(v);
      return;
    }
    if (typeof value === "object") {
      const name = (value as { filename?: unknown }).filename;
      if (typeof name === "string" && name.length > 0) out.push(name);
    }
  };
  for (const value of Object.values(responses)) visit(value);
  return out;
}

export async function saveIntake(args: IntakeSubmitArgs): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };

  // Verify booking ownership
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, client_id, service_key, service_type, session_at, workflow_status")
    .eq("id", args.bookingId)
    .single();

  if (!booking || booking.client_id !== user.id) {
    return { error: "Booking not found." };
  }

  if (!booking.service_key) {
    return { error: "Service type missing on this booking. Reach out to Rachel." };
  }

  const schema = getSchemaForService(booking.service_key);
  if (!schema) {
    return { error: "No intake form is configured for this service." };
  }

  if (args.submit) {
    const validationError = validateResponses(schema, args.responses);
    if (validationError) return { error: validationError };
  }

  const nowIso = new Date().toISOString();
  const service = createServiceClient();

  // Upsert intake_responses row (one per booking).
  const { error: upsertError } = await service
    .from("intake_responses")
    .upsert(
      {
        booking_id: args.bookingId,
        client_id: user.id,
        service_key: booking.service_key,
        responses: args.responses as Json,
        submitted_at: args.submit ? nowIso : null,
        last_saved_at: nowIso,
      },
      { onConflict: "booking_id" }
    );

  if (upsertError) return { error: upsertError.message };

  if (args.submit) {
    // Transition booking to intake_complete.
    await service
      .from("bookings")
      .update({ workflow_status: "intake_complete" })
      .eq("id", args.bookingId);

    // Look up client's display name + email for the confirmation email.
    const { data: profile } = await service
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const clientName = profile?.full_name || profile?.email?.split("@")[0] || "there";
    const clientEmail = profile?.email ?? "";

    const sessionAt = booking.session_at ? new Date(booking.session_at) : null;
    const sessionDate = sessionAt ? formatCentralDate(sessionAt) : "soon";
    const sessionTime = sessionAt ? formatCentralTime(sessionAt) : "TBD";

    if (clientEmail) {
      await sendTemplated("intake_complete", {
        to: clientEmail,
        bookingId: args.bookingId,
        clientId: user.id,
        idempotent: true,
        data: {
          client_name: clientName,
          session_date: sessionDate,
          session_time: sessionTime,
          session_workspace_url: `${APP_URL}/dashboard/sessions/${args.bookingId}`,
        },
      });
    }

    const uploadedFiles = collectUploadedFilenames(args.responses);

    // Notify Rachel that intake is ready. Folding the uploaded-file list into
    // the existing admin alert avoids spawning a second email per submission.
    await sendAdminBookingAlert(
      {
        clientName,
        clientEmail,
        serviceType: booking.service_type,
        slotDate: sessionDate,
        slotTime: sessionTime,
        bookingId: args.bookingId,
      },
      {
        subject: `Intake submitted: ${booking.service_type} — ${clientName}`,
        uploadedFiles,
      }
    ).catch(() => undefined);

    // In-app notifications: one for the submission, one per uploaded file so
    // Rachel can spot which materials arrived at a glance.
    await createAdminNotification({
      type: "intake_submitted",
      title: `Intake submitted: ${clientName}`,
      body: `${booking.service_type}${uploadedFiles.length ? ` · ${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"}` : ""}`,
      link: `/admin/clients/${user.id}#intake-${args.bookingId}`,
      bookingId: args.bookingId,
      clientId: user.id,
    });

    for (const filename of uploadedFiles) {
      await createAdminNotification({
        type: "client_doc_upload",
        title: `${clientName} uploaded ${filename}`,
        body: booking.service_type,
        link: `/admin/clients/${user.id}#intake-${args.bookingId}`,
        bookingId: args.bookingId,
        clientId: user.id,
      });
    }

    // Auto-task: tee up the deliverable / session prep work. Due 12h before
    // the session if scheduled, else 3 days out.
    const taskDueAt = sessionAt
      ? new Date(sessionAt.getTime() - 12 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 3 * 86400000).toISOString();
    await service
      .from("admin_tasks")
      .insert({
        title: "Prepare deliverable / session",
        description: `Intake complete for ${clientName} (${booking.service_type}).`,
        due_at: taskDueAt,
        related_booking_id: args.bookingId,
        related_client_id: user.id,
      })
      .then((res) => {
        if (res.error) {
          console.error("[saveIntake] admin_tasks insert failed:", res.error);
        }
      });
  }

  return { success: true };
}
