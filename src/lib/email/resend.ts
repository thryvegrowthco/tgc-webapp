import { Resend } from "resend";

// Lazy singleton — safe to import at module level without RESEND_API_KEY at build time
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY ?? "");
  }
  return _resend;
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return (getResend() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const FROM_EMAIL = "Thryve Growth Co. <hello@go.thryvegrowth.co>";

export interface BookingConfirmationData {
  clientName: string;
  clientEmail: string;
  serviceType: string;
  slotDate: string;   // e.g. "Monday, April 14, 2025"
  slotTime: string;   // e.g. "10:00 AM"
  bookingId: string;
}

export async function sendBookingConfirmation(data: BookingConfirmationData) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.clientEmail,
    subject: `Booking Confirmed — ${data.serviceType}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #203e35; margin: 0 0 4px;">
            Thryve Growth Co.
          </h1>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Clarity. Accountability. Real Growth.</p>
        </div>

        <div style="background: #f5ece3; border: 1px solid #d6eae5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #0f172a;">
            Your booking is confirmed ✓
          </h2>
          <p style="color: #475569; margin: 0; font-size: 15px;">
            Hi ${data.clientName}, I'm looking forward to our session.
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; width: 140px;">Service</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 14px;">${data.serviceType}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Date</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 14px;">${data.slotDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Time</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 14px;">${data.slotTime}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Booking ID</td>
            <td style="padding: 12px 0; font-size: 12px; color: #94a3b8; font-family: monospace;">${data.bookingId}</td>
          </tr>
        </table>

        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          You'll receive a video call link before our session. If you need to reschedule or have any questions, reply to this email or reach out at
          <a href="mailto:hello@go.thryvegrowth.co" style="color: #203e35;">hello@go.thryvegrowth.co</a>.
        </p>

        <p style="font-size: 14px; color: #475569; margin-top: 24px;">
          Talk soon,<br>
          <strong>Rachel</strong><br>
          <span style="color: #64748b;">Thryve Growth Co.</span>
        </p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 40px; padding-top: 20px;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            © ${new Date().getFullYear()} Thryve Growth Co. LLC ·
            <a href="https://thryvegrowth.co" style="color: #94a3b8;">thryvegrowth.co</a>
          </p>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendAdminBookingAlert(data: BookingConfirmationData) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: "hello@thryvegrowth.co",
    subject: `New Booking: ${data.serviceType} — ${data.clientName}`,
    html: `
      <p>New booking received:</p>
      <ul>
        <li><strong>Client:</strong> ${data.clientName} (${data.clientEmail})</li>
        <li><strong>Service:</strong> ${data.serviceType}</li>
        <li><strong>Date:</strong> ${data.slotDate} at ${data.slotTime}</li>
        <li><strong>Booking ID:</strong> ${data.bookingId}</li>
      </ul>
    `,
  });
}
