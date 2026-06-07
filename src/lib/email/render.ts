// Templated email send pipeline.
//
// Flow:
//   sendTemplated(key, to, data)
//     → loadTemplate(key) — DB row OR fallback from defaults.ts
//     → interpolate(subject + body, data) — replace {{placeholders}}
//     → renderShell(body) — wrap in brand frame
//     → resend.emails.send(...)
//     → log to automation_log (event_key: `${key}_sent`)
//
// Failures are caught and logged; we never throw from the send path —
// reminders should be best-effort, and the webhook already uses Promise.allSettled.

import { resend, FROM_EMAIL } from "./resend";
import { renderShell } from "./shell";
import { DEFAULT_TEMPLATES, type DefaultTemplate } from "./defaults";
import { createServiceClient } from "@/lib/supabase/service";
import { isNotificationDisabled } from "@/lib/notifications/settings";
import type { EmailTemplateKey, Json } from "@/types/database";

type Placeholders = Record<string, string | number | undefined | null>;

/** True if the value should render as "present" inside an `{{#if}}` block. */
function isTruthyPlaceholder(value: string | number | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "number") return true;
  return value.length > 0;
}

/**
 * Replace `{{key}}` placeholders with `data[key]` and strip / keep `{{#if key}}...{{/if}}`
 * blocks based on whether `data[key]` is non-empty. Missing keys render as empty strings.
 *
 * Conditional blocks must not nest. They render their inner contents (still subject to
 * `{{key}}` substitution) when the named key has a non-empty value, and disappear entirely
 * otherwise. This keeps templates editable in admin without exposing a full Handlebars runtime.
 */
function interpolate(input: string, data: Placeholders): string {
  const withConditionals = input.replace(
    /\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, key: string, inner: string) => (isTruthyPlaceholder(data[key]) ? inner : "")
  );

  return withConditionals.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = data[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

async function loadTemplate(key: EmailTemplateKey): Promise<DefaultTemplate> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("subject, body_html, placeholders")
      .eq("key", key)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_TEMPLATES[key];
    }

    return {
      subject: data.subject,
      bodyHtml: data.body_html,
      placeholders: data.placeholders ?? [],
    };
  } catch {
    // Defensive: if Supabase is unreachable, do not lose the email send.
    return DEFAULT_TEMPLATES[key];
  }
}

export interface SendTemplatedOptions {
  to: string;
  data: Placeholders;
  bookingId?: string;
  clientId?: string;
  /** Override the event_key written to automation_log. Defaults to `${templateKey}_sent`. */
  eventKey?: string;
  /** When set, an upsert on (event_key, booking_id) prevents duplicate sends. */
  idempotent?: boolean;
}

export interface SendTemplatedResult {
  sent: boolean;
  messageId?: string;
  skipped?: "already_logged" | "disabled";
  error?: string;
}

/**
 * Render `templateKey` with `data`, send via Resend, and log the result.
 * If `idempotent` is true, the call is a no-op when `(eventKey, bookingId)`
 * already exists in `automation_log`.
 */
export async function sendTemplated(
  templateKey: EmailTemplateKey,
  options: SendTemplatedOptions
): Promise<SendTemplatedResult> {
  const eventKey = options.eventKey ?? `${templateKey}_sent`;

  // Admin can disable discretionary client emails in /admin/settings. Critical
  // templates (receipt, welcome, intake_complete, deliverable_ready,
  // session_reminder_24h) have no settings row, so they are never suppressed.
  if (await isNotificationDisabled(`client_email:${templateKey}`)) {
    return { sent: false, skipped: "disabled" };
  }

  if (options.idempotent && options.bookingId) {
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("automation_log")
      .select("id")
      .eq("event_key", eventKey)
      .eq("booking_id", options.bookingId)
      .eq("status", "success")
      .maybeSingle();
    if (existing) {
      return { sent: false, skipped: "already_logged" };
    }
  }

  let template: DefaultTemplate;
  try {
    template = await loadTemplate(templateKey);
  } catch (err) {
    await logEvent(eventKey, options, {
      status: "failed",
      error_message: `loadTemplate failed: ${errorMessage(err)}`,
    });
    return { sent: false, error: "load_failed" };
  }

  let subject: string;
  let innerHtml: string;
  try {
    subject = interpolate(template.subject, options.data);
    innerHtml = interpolate(template.bodyHtml, options.data);
  } catch (err) {
    // Should never happen — interpolate doesn't throw, but defensive.
    await logEvent(eventKey, options, {
      status: "failed",
      error_message: `interpolate failed: ${errorMessage(err)}`,
    });
    return { sent: false, error: "render_failed" };
  }

  const html = renderShell(innerHtml);

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject,
      html,
    });

    if ("error" in result && result.error) {
      await logEvent(eventKey, options, {
        status: "failed",
        error_message: result.error.message ?? "Resend returned error",
      });
      return { sent: false, error: result.error.message };
    }

    const messageId = (result as { data?: { id?: string } }).data?.id;
    await logEvent(eventKey, options, {
      status: "success",
      payload: { resend_message_id: messageId, template_key: templateKey },
    });
    return { sent: true, messageId };
  } catch (err) {
    await logEvent(eventKey, options, {
      status: "failed",
      error_message: errorMessage(err),
    });
    return { sent: false, error: errorMessage(err) };
  }
}

interface LogEventArgs {
  status: "success" | "failed" | "skipped";
  payload?: Json;
  error_message?: string;
}

async function logEvent(
  eventKey: string,
  options: SendTemplatedOptions,
  args: LogEventArgs
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("automation_log").upsert(
      {
        event_key: eventKey,
        booking_id: options.bookingId ?? null,
        client_id: options.clientId ?? null,
        status: args.status,
        payload: args.payload ?? {},
        error_message: args.error_message ?? null,
      },
      { onConflict: "event_key,booking_id", ignoreDuplicates: false }
    );
  } catch {
    // Logging must not break sends.
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
