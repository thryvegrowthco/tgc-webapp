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
    placeholders: ["client_name", "service_type", "amount_formatted", "payment_date", "transaction_id"],
    bodyHtml: `<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thanks for your payment. Here are the details for your records:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  <tr><td style="padding:8px 0;color:#64748b;">Service</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">{{service_type}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">{{amount_formatted}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;text-align:right;color:#0f172a;">{{payment_date}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Transaction ID</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;">{{transaction_id}}</td></tr>
</table>
<p style="margin:0 0 16px;color:#475569;">A separate welcome email is on its way with next steps.</p>
<p style="margin:0;color:#475569;">Questions? Reply to this email or write to <a href="mailto:hello@thryvegrowth.co" style="color:#203e35;">hello@thryvegrowth.co</a>.</p>`,
  },

  welcome: {
    subject: "Welcome to Thryve Growth Co. — here's what comes next",
    placeholders: ["client_name", "service_type", "intake_due_date", "session_workspace_url", "session_date", "meet_link"],
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
};
