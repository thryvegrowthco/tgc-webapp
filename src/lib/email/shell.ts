// Shared brand shell wrapper for every templated email.
// Templates store INNER body HTML only; this wraps it with the header, cream
// card frame, and footer. Keeps the visual identity consistent across all
// transactional mail and lets Rachel edit copy without touching layout.

export function renderShell(innerHtml: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;background:#ffffff;max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="margin-bottom:32px;">
    <h1 style="font-size:24px;font-weight:700;color:#203e35;margin:0 0 4px;">Thryve Growth Co.</h1>
    <p style="color:#64748b;margin:0;font-size:14px;">Clarity. Accountability. Real Growth.</p>
  </div>

  <div style="background:#f5ece3;border:1px solid #e8ddd3;border-radius:12px;padding:32px;margin-bottom:24px;font-size:15px;line-height:1.6;">
    ${innerHtml}
  </div>

  <div style="border-top:1px solid #e2e8f0;margin-top:40px;padding-top:20px;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">
      &copy; ${new Date().getFullYear()} Thryve Growth Co. LLC &middot;
      <a href="https://thryvegrowth.co" style="color:#94a3b8;">thryvegrowth.co</a>
    </p>
  </div>
</body>
</html>`;
}
