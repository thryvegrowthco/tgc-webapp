// Default email template content — matches the seeds in migration 0010.
// These are the fallback Rachel can never break: if the DB row is missing,
// malformed, or rendering throws, `renderTemplate` falls back here so emails
// continue to flow.
//
// Keep this file in sync with the INSERT INTO email_templates ... block in
// supabase/migrations/0010_booking_automation.sql.

import type { EmailTemplateKey } from "@/types/database";

export interface DefaultTemplate {
  subject: string;
  bodyHtml: string;
  placeholders: string[];
}

export const DEFAULT_TEMPLATES: Record<EmailTemplateKey, DefaultTemplate> = {
  receipt: {
    subject: "Your receipt from Thryve Growth Co.",
    placeholders: [
      "client_name",
      "service_type",
      "amount_formatted",
      "payment_date",
      "transaction_id",
      "card_brand",
      "card_last4",
      "stripe_receipt_url",
      "support_email",
    ],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thanks for your payment. Here are the details for your records:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  <tr><td style="padding:8px 0;color:#64748b;">Service</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">{{service_type}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">{{amount_formatted}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;text-align:right;color:#0f172a;">{{payment_date}}</td></tr>
  {{#if card_last4}}<tr><td style="padding:8px 0;color:#64748b;">Paid with</td><td style="padding:8px 0;text-align:right;color:#0f172a;">{{card_brand}} ending in {{card_last4}}</td></tr>{{/if}}
  <tr><td style="padding:8px 0;color:#64748b;">Transaction ID</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;">{{transaction_id}}</td></tr>
</table>
{{#if stripe_receipt_url}}<p style="margin:0 0 24px;text-align:center;">
  <a href="{{stripe_receipt_url}}" style="display:inline-block;background:#ffffff;color:#203e35;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;border:1px solid #203e35;">View Stripe receipt</a>
</p>{{/if}}
<p style="margin:0 0 16px;color:#475569;">A separate welcome email is on its way with next steps.</p>
<p style="margin:0;color:#475569;">Questions? Reply to this email or write to <a href="mailto:{{support_email}}" style="color:#203e35;">{{support_email}}</a>.</p>`,
  },

  welcome: {
    subject: "Welcome to Thryve Growth Co. — here's what comes next",
    placeholders: [
      "client_name",
      "service_type",
      "intake_due_date",
      "session_workspace_url",
      "session_date",
      "meet_link",
      "signed_agreement_url",
    ],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thank you so much for booking <strong>{{service_type}}</strong>. I'm excited to support you.</p>
<p style="margin:0 0 24px;">Before we get started, here's how the next few days will go:</p>
<ol style="margin:0 0 24px;padding-left:20px;color:#0f172a;">
  <li style="margin:0 0 12px;"><strong>Complete your intake form</strong> by {{intake_due_date}}. It takes about 5 minutes and helps me make our time together as valuable as possible.</li>
  <li style="margin:0 0 12px;"><strong>Upload any materials</strong> (resume, job posting, current cover letter) so I can review them in advance.</li>
  <li style="margin:0 0 12px;"><strong>Open your session workspace</strong> for the meeting link, prep guidance, and a place to message me directly.</li>
</ol>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{session_workspace_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Open your session workspace</a>
</p>
{{#if signed_agreement_url}}<p style="margin:0 0 16px;color:#475569;">Your signed service agreement is <a href="{{signed_agreement_url}}" style="color:#203e35;">on file here</a> for your records.</p>{{/if}}
<p style="margin:0 0 16px;color:#475569;"><strong>Need to reschedule?</strong> Reply to this email at least 24 hours before our session and we'll find a new time. Cancellations within 24 hours are non-refundable.</p>
<p style="margin:0;color:#475569;">Direct. Honest. Practical.<br/>— Rachel</p>`,
  },

  intake_reminder_48h: {
    subject: "Quick reminder: your intake form for {{service_type}}",
    placeholders: ["client_name", "service_type", "session_workspace_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Just a friendly nudge — your intake form for our upcoming {{service_type}} is due in 48 hours. It takes about 5 minutes.</p>
<p style="margin:0 0 16px;">The more you share, the more we can get done together.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{session_workspace_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Complete your intake</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  intake_reminder_24h: {
    subject: "One more nudge — your intake form for {{service_type}}",
    placeholders: ["client_name", "service_type", "session_time", "session_workspace_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">We're meeting tomorrow at {{session_time}}. I want to make sure I'm as prepared as possible — the more I know going in, the more we can get done together.</p>
<p style="margin:0 0 16px;">Could you take 5 minutes to fill out the intake form?</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{session_workspace_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Complete your intake</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  intake_complete: {
    subject: "Got it — I'll review before we meet",
    placeholders: ["client_name", "session_date", "session_time", "session_workspace_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thanks for completing your intake form. I'll review everything carefully before we meet on <strong>{{session_date}} at {{session_time}}</strong>.</p>
<p style="margin:0 0 16px;">A few things to think about before we connect:</p>
<ul style="margin:0 0 24px;padding-left:20px;color:#0f172a;">
  <li style="margin:0 0 8px;">What does a successful session look like for you?</li>
  <li style="margin:0 0 8px;">What's the one thing you'd most like to walk away with?</li>
</ul>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{session_workspace_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Open your session workspace</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  session_reminder_24h: {
    subject: "We're meeting tomorrow at {{session_time}}",
    placeholders: ["client_name", "session_date", "session_time", "meet_link", "session_workspace_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Looking forward to our session tomorrow.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
  <tr><td style="padding:16px;">
    <p style="margin:0 0 8px;color:#64748b;font-size:14px;">When</p>
    <p style="margin:0 0 16px;color:#0f172a;font-weight:600;">{{session_date}} at {{session_time}} (CT)</p>
    <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Join via</p>
    <p style="margin:0;"><a href="{{meet_link}}" style="color:#203e35;font-weight:600;text-decoration:none;">{{meet_link}}</a></p>
  </td></tr>
</table>
<p style="margin:0 0 16px;color:#475569;">If something came up, reply to this email and we'll find a new time.</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  post_service_followup: {
    subject: "How'd it go? A few next steps from our session",
    placeholders: ["client_name", "service_type", "session_workspace_url", "testimonial_url", "book_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Hope our recent {{service_type}} was useful. Here are three things to keep momentum:</p>
<ol style="margin:0 0 24px;padding-left:20px;color:#0f172a;">
  <li style="margin:0 0 12px;"><strong>Review what we covered</strong> — any notes or materials I shared are in your <a href="{{session_workspace_url}}" style="color:#203e35;">session workspace</a>.</li>
  <li style="margin:0 0 12px;"><strong>Share a quick testimonial</strong> if it's been helpful — it takes about 60 seconds and means a lot. <a href="{{testimonial_url}}" style="color:#203e35;">Leave one here.</a></li>
  <li style="margin:0 0 12px;"><strong>Need another session?</strong> <a href="{{book_url}}" style="color:#203e35;">Book it here</a> while it's top of mind.</li>
</ol>
<p style="margin:0 0 16px;color:#475569;">Direct. Honest. Practical.</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  deliverable_ready: {
    subject: "Your {{deliverable_type}} is ready",
    placeholders: ["client_name", "deliverable_type", "deliverable_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Your <strong>{{deliverable_type}}</strong> is ready and waiting in your Thryve dashboard.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{deliverable_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Open your dashboard</a>
</p>
<p style="margin:0 0 16px;color:#475569;">Let me know if you have any questions.</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  new_job_match: {
    subject: "New job matches in your Thryve watchlist",
    placeholders: ["client_name", "match_count", "match_plural", "dashboard_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Good news — <strong>{{match_count}}</strong> new job match{{#if match_plural}}es{{/if}} just landed in your watchlist based on your preferences.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Review your matches</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  curated_job_match: {
    subject: "Rachel picked a job for you",
    placeholders: ["client_name", "job_title", "company", "match_reason", "recommended_action", "dashboard_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">I personally found a role I think is worth a look:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 4px;font-weight:600;font-size:16px;color:#0f172a;">{{job_title}}</p>
    <p style="margin:0 0 12px;color:#64748b;">{{company}}</p>
    {{#if match_reason}}<p style="margin:0 0 8px;color:#0f172a;"><strong>Why it matches:</strong> {{match_reason}}</p>{{/if}}
    {{#if recommended_action}}<p style="margin:0;color:#0f172a;"><strong>Recommended next step:</strong> {{recommended_action}}</p>{{/if}}
  </td></tr>
</table>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">View this match</a>
</p>
<p style="margin:0;color:#475569;">Direct. Honest. Practical.<br/>— Rachel</p>`,
  },

  watchlist_updated: {
    subject: "Your Thryve watchlist preferences were updated",
    placeholders: ["client_name", "dashboard_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Your watchlist preferences were just updated. Future job searches will use your latest criteria.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#ffffff;color:#203e35;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;border:1px solid #203e35;">View your watchlist</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  application_reminder: {
    subject: "How's your application going?",
    placeholders: ["client_name", "job_title", "company", "applied_date", "dashboard_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">It's been a little while since you applied to <strong>{{job_title}}</strong> at {{company}} ({{applied_date}}). Any movement? Update your tracker so we can plan next steps together.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Update your tracker</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  booking_invitation: {
    subject: "Choose a Time for Your Thryve Session",
    placeholders: ["client_name", "booking_url", "custom_message", "service_type", "session_length", "meeting_type"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">I'm excited to get your session scheduled. Please choose the date and time that works best for you using the link below:</p>
{{#if custom_message}}<p style="margin:0 0 16px;color:#475569;">{{custom_message}}</p>{{/if}}
<p style="margin:0 0 28px;text-align:center;">
  <a href="{{booking_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Choose My Session Time</a>
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 10px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">Session details</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Service:</strong> {{service_type}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Session length:</strong> {{session_length}}</p>
    <p style="margin:0;color:#0f172a;"><strong>Meeting type:</strong> {{meeting_type}}</p>
  </td></tr>
</table>
<p style="margin:0 0 16px;color:#475569;">Once you select your time, you'll receive a confirmation email with the session details. If none of the times work, just reply to this email and I'll send over a few more options.</p>
<p style="margin:0;color:#475569;">Looking forward to connecting with you!<br/>— Rachel</p>`,
  },

  session_confirmed: {
    subject: "Your Thryve Session is Confirmed",
    placeholders: ["client_name", "service_type", "session_date", "session_time", "session_length", "meeting_type", "meeting_location", "meet_link", "session_workspace_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">You're officially scheduled!</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 10px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">Session details</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Service:</strong> {{service_type}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Date:</strong> {{session_date}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Time:</strong> {{session_time}} (CT)</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Length:</strong> {{session_length}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Meeting type:</strong> {{meeting_type}}</p>
    {{#if meeting_location}}<p style="margin:0;color:#0f172a;"><strong>Where:</strong> {{meeting_location}}</p>{{/if}}
  </td></tr>
</table>
{{#if meet_link}}<p style="margin:0 0 24px;text-align:center;">
  <a href="{{meet_link}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Join Google Meet</a>
</p>{{/if}}
<p style="margin:0 0 16px;color:#475569;">Before your session, please complete any required intake forms or send over anything you'd like me to review in advance. You can also reply to this email if anything changes.</p>
{{#if session_workspace_url}}<p style="margin:0 0 16px;color:#475569;">Your session workspace is <a href="{{session_workspace_url}}" style="color:#203e35;">here</a>.</p>{{/if}}
<p style="margin:0;color:#475569;">Looking forward to connecting with you!<br/>— Rachel</p>`,
  },

  session_reminder_1h: {
    subject: "Starting soon — your Thryve session at {{session_time}}",
    placeholders: ["client_name", "session_date", "session_time", "meeting_type", "meet_link", "meeting_location", "session_workspace_url"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Your session starts in about an hour. Here are the details so you're ready:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
  <tr><td style="padding:16px;">
    <p style="margin:0 0 8px;color:#64748b;font-size:14px;">When</p>
    <p style="margin:0 0 16px;color:#0f172a;font-weight:600;">{{session_date}} at {{session_time}} (CT)</p>
    <p style="margin:0 0 8px;color:#64748b;font-size:14px;">{{meeting_type}}</p>
    {{#if meet_link}}<p style="margin:0;"><a href="{{meet_link}}" style="color:#203e35;font-weight:600;text-decoration:none;">{{meet_link}}</a></p>{{/if}}
    {{#if meeting_location}}<p style="margin:0;color:#0f172a;">{{meeting_location}}</p>{{/if}}
  </td></tr>
</table>
<p style="margin:0 0 16px;color:#475569;">See you soon!</p>
<p style="margin:0;color:#475569;">— Rachel</p>`,
  },

  new_session_booked: {
    subject: "New Session Booked: {{client_name}}",
    placeholders: ["client_name", "client_email", "service_type", "session_type", "session_date", "session_time", "session_length", "meeting_type", "client_notes", "admin_session_url", "calendar_link"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi Rachel,</p>
<p style="margin:0 0 16px;">A client has selected a session time.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Client:</strong> {{client_name}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Email:</strong> {{client_email}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Service:</strong> {{service_type}}</p>
    {{#if session_type}}<p style="margin:0 0 6px;color:#0f172a;"><strong>Session type:</strong> {{session_type}}</p>{{/if}}
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Date:</strong> {{session_date}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Time:</strong> {{session_time}} (CT)</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Duration:</strong> {{session_length}}</p>
    <p style="margin:0;color:#0f172a;"><strong>Meeting type:</strong> {{meeting_type}}</p>
  </td></tr>
</table>
{{#if client_notes}}<p style="margin:0 0 16px;color:#475569;"><strong>Client notes:</strong> {{client_notes}}</p>{{/if}}
<p style="margin:0 0 28px;text-align:center;">
  <a href="{{admin_session_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">View Session</a>
</p>
{{#if calendar_link}}<p style="margin:0;color:#475569;">Calendar event: <a href="{{calendar_link}}" style="color:#203e35;">open in Google Calendar</a></p>{{/if}}`,
  },
};
