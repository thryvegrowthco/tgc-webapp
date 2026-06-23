// Canned "we missed you" email for subscribers who haven't opened anything
// in 60+ days. Sent by /api/cron/newsletter-reengage, capped per run.

import { resend, FROM_EMAIL, REPLY_TO_EMAIL } from "./resend";
import {
  buildManageUrl,
  buildUnsubscribeApiUrl,
  buildUnsubscribeUrl,
  newsletterBusinessAddress,
  newsletterPublicUrl,
} from "./newsletter-render";

export interface ReengagementInput {
  email: string;
  firstName: string | null;
  unsubscribeToken: string;
}

export async function sendReengagementEmail(input: ReengagementInput) {
  const firstName = input.firstName?.trim() || "there";
  const unsubscribeUrl = buildUnsubscribeUrl(input.unsubscribeToken);
  const unsubscribeApiUrl = buildUnsubscribeApiUrl(input.unsubscribeToken);
  const manageUrl = buildManageUrl(input.unsubscribeToken);
  const publicUrl = newsletterPublicUrl();

  return resend.emails.send({
    from: FROM_EMAIL,
    to: input.email,
    replyTo: REPLY_TO_EMAIL,
    subject: "Still want these emails?",
    headers: {
      "List-Unsubscribe": `<mailto:hello@thryvegrowth.co?subject=unsubscribe>, <${unsubscribeApiUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8f5f1;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">

        <tr>
          <td style="padding:32px 32px 24px 32px;background:#f5ece3;border-bottom:1px solid #e8dbc8;">
            <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#203e35;">Thryve Growth Co.</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 32px 16px 32px;">
            <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
              Hey ${escapeHtml(firstName)} — checking in.
            </h2>
            <p style="margin:0 0 16px;font-size:16px;color:#334155;line-height:1.65;">
              Life gets busy and inboxes get full. I haven't seen you open one of these in a while, and I don't want to keep landing in your inbox if it's not useful anymore.
            </p>
            <p style="margin:0 0 16px;font-size:16px;color:#334155;line-height:1.65;">
              If you still want the weekly email, no action needed — I'll keep sending them. If your priorities have shifted, you can update what you hear about or step off the list entirely.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:8px 32px 24px 32px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="padding-right:12px;">
                  <a href="${manageUrl}" style="display:inline-block;background:#203e35;color:#ffffff;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;text-decoration:none;">
                    Update my interests
                  </a>
                </td>
                <td>
                  <a href="${unsubscribeUrl}" style="display:inline-block;background:#ffffff;color:#475569;font-size:14px;font-weight:600;padding:10px 18px;border:1px solid #cbd5e1;border-radius:8px;text-decoration:none;">
                    Unsubscribe
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0 0 4px;font-size:15px;color:#475569;">Either way, thanks for being here at all.</p>
            <p style="margin:0;font-size:15px;color:#0f172a;"><strong>Rachel</strong><br><span style="color:#6b7280;font-size:13px;">Thryve Growth Co.</span></p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 32px 32px;background:#fafaf7;border-top:1px solid #ece6da;">
            <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;line-height:1.5;">
              ${escapeHtml(newsletterBusinessAddress())}
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;">
              © ${new Date().getFullYear()} Thryve Growth Co. LLC · <a href="${escapeHtml(publicUrl)}" style="color:#cbd5e1;text-decoration:none;">thryvegrowth.co</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
  });
}

export interface MilestoneInput {
  email: string;
  firstName: string | null;
  unsubscribeToken: string;
  milestone: "6_months" | "1_year";
}

export async function sendMilestoneEmail(input: MilestoneInput) {
  const firstName = input.firstName?.trim() || "there";
  const unsubscribeUrl = buildUnsubscribeUrl(input.unsubscribeToken);
  const unsubscribeApiUrl = buildUnsubscribeApiUrl(input.unsubscribeToken);
  const manageUrl = buildManageUrl(input.unsubscribeToken);
  const publicUrl = newsletterPublicUrl();
  const label = input.milestone === "1_year" ? "a year" : "six months";

  return resend.emails.send({
    from: FROM_EMAIL,
    to: input.email,
    replyTo: REPLY_TO_EMAIL,
    subject: `${input.milestone === "1_year" ? "A year" : "Six months"} of these emails — thank you`,
    headers: {
      "List-Unsubscribe": `<mailto:hello@thryvegrowth.co?subject=unsubscribe>, <${unsubscribeApiUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8f5f1;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="padding:32px 32px 24px 32px;background:#f5ece3;border-bottom:1px solid #e8dbc8;">
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#203e35;">Thryve Growth Co.</h1>
  </td></tr>
  <tr><td style="padding:32px 32px 0 32px;">
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
      ${escapeHtml(firstName)}, it's been ${label}.
    </h2>
    <p style="margin:0 0 16px;font-size:16px;color:#334155;line-height:1.65;">
      A small thing to mark a small milestone — you've been reading these emails for ${label} now, and I just want to say thank you. It genuinely matters that you let me show up in your inbox.
    </p>
    <p style="margin:0 0 16px;font-size:16px;color:#334155;line-height:1.65;">
      If there's anything you want more or less of, hit reply and tell me. I read every response.
    </p>
  </td></tr>
  <tr><td style="padding:8px 32px 28px 32px;">
    <p style="margin:0 0 4px;font-size:15px;color:#475569;">With gratitude,</p>
    <p style="margin:0;font-size:15px;color:#0f172a;"><strong>Rachel</strong></p>
  </td></tr>
  <tr><td style="padding:24px 32px 32px 32px;background:#fafaf7;border-top:1px solid #ece6da;">
    <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;line-height:1.5;">
      <a href="${manageUrl}" style="color:#64748b;text-decoration:underline;">Update interests</a> · <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a><br>
      ${escapeHtml(newsletterBusinessAddress())}
    </p>
    <p style="margin:0;font-size:11px;color:#cbd5e1;">
      © ${new Date().getFullYear()} Thryve Growth Co. LLC · <a href="${escapeHtml(publicUrl)}" style="color:#cbd5e1;text-decoration:none;">thryvegrowth.co</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`,
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
