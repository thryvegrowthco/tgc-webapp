import { resend, FROM_EMAIL, REPLY_TO_EMAIL } from "@/lib/email/resend";

// Branded auth email templates. Styling matches the booking confirmation email:
// header color #203e35, accent background #f5ece3, footer with copyright.

export async function sendSignupConfirmation(
  email: string,
  name: string,
  confirmUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO_EMAIL,
    subject: "Confirm your Thryve Growth Co. account",
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
            Welcome${name ? `, ${name}` : ""}!
          </h2>
          <p style="color: #475569; margin: 0; font-size: 15px;">
            Please confirm your email address to activate your account.
          </p>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Click the button below to verify your email. This link expires in 24 hours.
        </p>

        <a
          href="${confirmUrl}"
          style="display: inline-block; background: #203e35; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;"
        >
          Confirm my account
        </a>

        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${confirmUrl}" style="color: #203e35; word-break: break-all;">${confirmUrl}</a>
        </p>

        <p style="font-size: 14px; color: #475569; margin-top: 24px;">
          If you didn't create an account, you can safely ignore this email.
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

// Sent when Rachel creates the account from the admin panel (rather than the
// client signing themselves up). They already have an account — they only need
// to set a password — so the "confirm the account you created" framing and the
// "if you didn't create an account, ignore this" line would both be wrong.
export async function sendClientInvite(
  email: string,
  name: string,
  confirmUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO_EMAIL,
    subject: "Your Thryve Growth Co. account is ready",
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
            Welcome${name ? `, ${name}` : ""}!
          </h2>
          <p style="color: #475569; margin: 0; font-size: 15px;">
            Rachel set up a Thryve Growth Co. account for you. Choose a password and it's yours.
          </p>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Click below to sign in and set your password. This link expires in 24 hours —
          just reply to this email if you need a fresh one.
        </p>

        <a
          href="${confirmUrl}"
          style="display: inline-block; background: #203e35; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;"
        >
          Set up my account
        </a>

        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${confirmUrl}" style="color: #203e35; word-break: break-all;">${confirmUrl}</a>
        </p>

        <p style="font-size: 14px; color: #475569; margin-top: 24px;">
          Not expecting this? Reply and let us know — we'll remove the account.
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

export async function sendPasswordReset(
  email: string,
  name: string,
  resetUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO_EMAIL,
    subject: "Reset your password, Thryve Growth Co.",
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
            Password reset request
          </h2>
          <p style="color: #475569; margin: 0; font-size: 15px;">
            Hi${name ? ` ${name}` : ""}, we received a request to reset your password.
          </p>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Click the button below to choose a new password. This link expires in 1 hour.
        </p>

        <a
          href="${resetUrl}"
          style="display: inline-block; background: #203e35; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;"
        >
          Reset my password
        </a>

        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #203e35; word-break: break-all;">${resetUrl}</a>
        </p>

        <p style="font-size: 14px; color: #475569; margin-top: 24px;">
          If you didn't request a password reset, you can safely ignore this email. Your password won't change.
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

export async function sendEmailChange(
  email: string,
  newEmail: string,
  confirmUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO_EMAIL,
    subject: "Confirm your new email address, Thryve Growth Co.",
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
            Confirm your new email address
          </h2>
          <p style="color: #475569; margin: 0; font-size: 15px;">
            You requested to change your email to <strong>${newEmail}</strong>.
          </p>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Click the button below to confirm this change. This link expires in 24 hours.
        </p>

        <a
          href="${confirmUrl}"
          style="display: inline-block; background: #203e35; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;"
        >
          Confirm new email
        </a>

        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${confirmUrl}" style="color: #203e35; word-break: break-all;">${confirmUrl}</a>
        </p>

        <p style="font-size: 14px; color: #475569; margin-top: 24px;">
          If you didn't request this change, please contact us at
          <a href="mailto:hello@thryvegrowth.co" style="color: #203e35;">hello@thryvegrowth.co</a>.
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

export async function sendMagicLink(
  email: string,
  name: string,
  magicLinkUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO_EMAIL,
    subject: "Your sign-in link, Thryve Growth Co.",
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
            Your sign-in link
          </h2>
          <p style="color: #475569; margin: 0; font-size: 15px;">
            Hi${name ? ` ${name}` : ""}, here is your one-click sign-in link.
          </p>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Click the button below to sign in. This link expires in 1 hour and can only be used once.
        </p>

        <a
          href="${magicLinkUrl}"
          style="display: inline-block; background: #203e35; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;"
        >
          Sign in
        </a>

        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${magicLinkUrl}" style="color: #203e35; word-break: break-all;">${magicLinkUrl}</a>
        </p>

        <p style="font-size: 14px; color: #475569; margin-top: 24px;">
          If you didn't request this link, you can safely ignore this email.
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
