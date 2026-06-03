// Brand-aligned HTML shell for newsletter emails.
//
// All styles inlined — `<style>` blocks and external classes are stripped by
// most email clients. One narrow @media query at the bottom handles mobile.
// Header logo is a PNG, not SVG (Gmail strips inline SVG).
//
// `{{first_name}}` and `{{unsubscribe_url}}` placeholders are substituted
// per-recipient by the send pipeline (newsletter-send.ts).

export interface NewsletterShellInput {
  subject: string;
  preheader: string;
  bodyHtml: string;       // already serialized from Tiptap
  publicUrl: string;      // site URL for footer links
  businessAddress: string;
  unsubscribePlaceholder?: string;  // defaults to {{unsubscribe_url}}
  managePlaceholder?: string;       // defaults to {{manage_url}}
}

export function renderNewsletterShell(input: NewsletterShellInput): string {
  const {
    subject,
    preheader,
    bodyHtml,
    publicUrl,
    businessAddress,
    unsubscribePlaceholder = "{{unsubscribe_url}}",
    managePlaceholder = "{{manage_url}}",
  } = input;

  // Preheader: invisible inbox-preview text. Padded with non-breaking spaces
  // so the next email content doesn't bleed into the preview.
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f5ece3;opacity:0;">${escapeHtml(preheader)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
${preheaderHtml}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8f5f1;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">

        <!-- Header -->
        <tr>
          <td style="padding:32px 32px 24px 32px;background:#f5ece3;border-bottom:1px solid #e8dbc8;">
            <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#203e35;letter-spacing:-0.01em;">Thryve Growth Co.</h1>
            <p style="margin:0;font-size:13px;color:#6b6356;">Clarity. Accountability. Real Growth.</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <p style="margin:0 0 4px;font-size:15px;color:#475569;">Hi {{first_name}},</p>
          </td>
        </tr>

        <!-- Body (Tiptap-rendered HTML) -->
        <tr>
          <td class="nl-body" style="padding:8px 32px 24px 32px;font-size:16px;line-height:1.65;color:#334155;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Sign-off -->
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0 0 4px;font-size:15px;color:#475569;">Talk soon,</p>
            <p style="margin:0;font-size:15px;color:#0f172a;"><strong>Rachel</strong><br><span style="color:#6b7280;font-size:13px;">Thryve Growth Co.</span></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px 32px 32px;background:#fafaf7;border-top:1px solid #ece6da;">
            <p style="margin:0 0 12px;font-size:12px;color:#94a3b8;line-height:1.6;">
              You're receiving this because you subscribed to the Thryve Growth Co. newsletter.
              <a href="${managePlaceholder}" style="color:#64748b;text-decoration:underline;">Update your interests</a>
              ·
              <a href="${unsubscribePlaceholder}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
            </p>
            <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;line-height:1.5;">
              ${escapeHtml(businessAddress)}
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

<!-- One narrow @media query, low risk of being stripped -->
<style>
@media (max-width:600px) {
  .nl-body { padding:8px 20px 20px 20px !important; font-size:15px !important; }
}
</style>
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
