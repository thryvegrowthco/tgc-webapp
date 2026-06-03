// Welcome email sent immediately after newsletter signup. Voice modeled on
// sendConsultationRequestAutoReply — warm, second-person, no hype.

import { resend, FROM_EMAIL } from "./resend";
import {
  buildManageUrl,
  buildUnsubscribeApiUrl,
  buildUnsubscribeUrl,
  newsletterBusinessAddress,
  newsletterPublicUrl,
} from "./newsletter-render";

export interface WelcomeEmailInput {
  email: string;
  firstName: string | null;
  unsubscribeToken: string;
}

export async function sendWelcomeEmail(input: WelcomeEmailInput) {
  const firstName = input.firstName?.trim() || "there";
  const unsubscribeUrl = buildUnsubscribeUrl(input.unsubscribeToken);
  const unsubscribeApiUrl = buildUnsubscribeApiUrl(input.unsubscribeToken);
  const manageUrl = buildManageUrl(input.unsubscribeToken);
  const publicUrl = newsletterPublicUrl();

  return resend.emails.send({
    from: FROM_EMAIL,
    to: input.email,
    replyTo: "hello@thryvegrowth.co",
    subject: "Welcome to the Thryve newsletter",
    headers: {
      "List-Unsubscribe": `<mailto:hello@thryvegrowth.co?subject=unsubscribe>, <${unsubscribeApiUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: buildWelcomeHtml({
      firstName: escapeHtml(firstName),
      unsubscribeUrl,
      manageUrl,
      publicUrl,
      businessAddress: newsletterBusinessAddress(),
    }),
  });
}

function buildWelcomeHtml(p: {
  firstName: string;
  unsubscribeUrl: string;
  manageUrl: string;
  publicUrl: string;
  businessAddress: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5ece3;">A short note from Rachel about what's coming your way each week.</div>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8f5f1;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">

        <tr>
          <td style="padding:32px 32px 24px 32px;background:#f5ece3;border-bottom:1px solid #e8dbc8;">
            <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#203e35;">Thryve Growth Co.</h1>
            <p style="margin:0;font-size:13px;color:#6b6356;">Clarity. Accountability. Real Growth.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
              Glad you're here, ${p.firstName}.
            </h2>
            <p style="margin:0;font-size:16px;color:#475569;line-height:1.65;">
              Quick note from me before you get a single newsletter — just so you know what you signed up for.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <p style="margin:0 0 16px;font-size:16px;color:#334155;line-height:1.65;">
              Every week, I send one short email. No hype, no funnel — just the kind of thing I'd send a friend who's working on their career or their team. You can expect:
            </p>
            <ul style="margin:0 0 16px;padding-left:20px;color:#334155;font-size:16px;line-height:1.7;">
              <li>A short reflection or motivation for the week</li>
              <li>One blog or article worth your time</li>
              <li>A practical career or leadership tip you can use today</li>
              <li>A resource — template, checklist, or guide</li>
              <li>Occasionally, an update on what I'm offering</li>
            </ul>
            <p style="margin:0 0 16px;font-size:16px;color:#334155;line-height:1.65;">
              That's it. One email, once a week, usually Tuesday mornings.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:8px 32px 8px 32px;">
            <div style="background:#f5ece3;border-left:3px solid #203e35;padding:16px 20px;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:15px;color:#334155;line-height:1.6;">
                <strong style="color:#0f172a;">One favor:</strong> if something lands for you, hit reply and tell me. I read every response personally — this isn't a no-reply list.
              </p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 32px 32px;">
            <p style="margin:0 0 4px;font-size:15px;color:#475569;">Talk soon,</p>
            <p style="margin:0;font-size:15px;color:#0f172a;"><strong>Rachel</strong><br><span style="color:#6b7280;font-size:13px;">Thryve Growth Co.</span></p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 32px 32px;background:#fafaf7;border-top:1px solid #ece6da;">
            <p style="margin:0 0 12px;font-size:12px;color:#94a3b8;line-height:1.6;">
              You're getting this because you just subscribed at <a href="${p.publicUrl}" style="color:#64748b;text-decoration:underline;">thryvegrowth.co</a>.
              <a href="${p.manageUrl}" style="color:#64748b;text-decoration:underline;">Update your interests</a>
              ·
              <a href="${p.unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
            </p>
            <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;line-height:1.5;">
              ${escapeHtml(p.businessAddress)}
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;">
              © ${new Date().getFullYear()} Thryve Growth Co. LLC
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
