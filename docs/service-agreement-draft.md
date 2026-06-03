# Service Agreement — Starter Draft

> **For Rachel to review and revise.** This is plain-language scaffolding for the
> client-facing service agreement. Once finalized, export this as a PDF and place
> it at `public/legal/service-agreement.pdf`. Bump
> `NEXT_PUBLIC_CONTRACT_VERSION` whenever the meaningful terms change.
>
> This is not legal advice. Please have an attorney review the final language
> before deploying. The `{{ }}` markers are notes for you, not placeholders the
> app interpolates.

---

## Thryve Growth Co. — Service Agreement

**Effective:** {{ DATE YOU FINALIZE THIS }}
**Version:** {{ MATCHES NEXT_PUBLIC_CONTRACT_VERSION, e.g. "2026-06-01" }}
**Between:** Thryve Growth Co. LLC ("Thryve") and the individual or organization
booking a service ("Client").

By checking the "I agree to the Service Agreement" box at checkout, Client
agrees to the following terms.

---

### 1. Services

Thryve provides career coaching, leadership coaching, interview preparation,
resume and cover letter support, job alerts and watchlist services, HR
consulting, and culture and engagement consulting. The specific service Client
has purchased is reflected in the receipt and booking confirmation.

Sessions are delivered via Google Meet unless otherwise agreed. Resume and
written deliverables are delivered through Client's Thryve dashboard.

### 2. Fees and Payment

Fees are listed at thryvegrowth.co/book and charged at the time of booking via
Stripe. All payments are in U.S. dollars. Subscription services (e.g., Job
Alerts) renew automatically each month until canceled.

### 3. Cancellation, Rescheduling, and Refunds

- **More than 24 hours before the scheduled session:** Client may reschedule or
  cancel at no charge by replying to the booking confirmation email.
- **Within 24 hours of the scheduled session:** Session is non-refundable. One
  reschedule may be granted at Thryve's discretion.
- **No-shows:** Session is forfeit. No refund.
- **Multi-session packages:** All sessions must be scheduled and completed
  within 90 days of purchase.
- **Resume rewrites and HR project work:** Refunds are not available once work
  has begun. Two revision rounds are included; additional rounds may be billed
  separately.
- **Job Alerts subscription:** Client may cancel at any time. Access continues
  through the current billing period; no partial-period refunds.

### 4. Client Responsibilities

Client agrees to:
- Complete the intake form before each session (where applicable);
- Provide accurate information;
- Attend scheduled sessions on time;
- Treat communications respectfully.

### 5. Confidentiality

Thryve will not share Client's personal information, session content, uploaded
documents, or intake responses outside of what is necessary to deliver the
service. Client may share session content as they choose; Thryve will not
attribute quotes or testimonials without permission.

### 6. Intellectual Property

Templates, frameworks, and other prepared materials remain Thryve's property.
Deliverables created specifically for Client (e.g., a rewritten resume) become
Client's property upon final payment.

### 7. Scope and Outcomes

Coaching and consulting outcomes depend on factors beyond Thryve's control,
including the job market and Client's own actions. Thryve does not guarantee
specific outcomes, including job placement, salary increases, or interview
success.

### 8. Communication

Outside of scheduled sessions, communication happens via the Thryve dashboard
messaging tool or email. Thryve typically responds within one to two business
days.

### 9. Termination

Either party may terminate this engagement at any time. Unused, prepaid
sessions are refundable on a prorated basis at Thryve's discretion.

### 10. Limitation of Liability

Thryve's total liability under this agreement is limited to the amount Client
paid for the specific service in question.

### 11. Governing Law

This agreement is governed by the laws of {{ STATE WHERE RACHEL'S BUSINESS IS
REGISTERED }}. Any disputes will be resolved in the courts of that jurisdiction.

### 12. Updates

Thryve may update this agreement. Bookings are governed by the version of the
agreement in effect at the time of purchase, recorded on the booking record.

---

**Questions?** Email hello@thryvegrowth.co before booking.

---

## Next steps for Rachel

1. Review every section above. Edit anything that doesn't match how you want to
   run engagements.
2. Decide your governing law jurisdiction (Section 11).
3. Set the effective date and version (top).
4. Export this Markdown to a PDF (Google Docs → File → Download → PDF, or any
   Markdown-to-PDF tool).
5. Save the PDF as `public/legal/service-agreement.pdf` in this repo.
6. Set `NEXT_PUBLIC_CONTRACT_VERSION` in `.env.local` and Vercel to match the
   version string in the document (e.g., `"2026-06-01"`).
7. Have a lawyer review before going live — the language above is a starting
   point, not legal advice.
