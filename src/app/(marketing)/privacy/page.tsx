import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Thryve Growth Co. LLC",
};

export default function PrivacyPage() {
  const effectiveDate = "April 1, 2025";

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-neutral-500 mb-10">Effective date: {effectiveDate}</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-neutral-700 text-sm leading-relaxed">

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">1. Who We Are</h2>
            <p>
              Thryve Growth Co. LLC (&ldquo;Thryve Growth Co.&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the website thryvegrowth.co and provides HR consulting, career coaching, and related services. This Privacy Policy explains how we collect, use, and protect information you provide to us.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name, email address, and phone number when you contact us or book a call</li>
              <li>Professional information (job title, company, career goals) when you engage our services</li>
              <li>Payment information processed securely through Stripe (we do not store card numbers)</li>
              <li>Communications you send us via email or contact forms</li>
              <li>Account information if you create a client dashboard account</li>
            </ul>
            <p className="mt-3">We also collect limited technical information automatically, including browser type, pages visited, and referring URLs, via standard web analytics.</p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, schedule, and improve our services</li>
              <li>Communicate with you about your inquiries, bookings, and engagements</li>
              <li>Send you service-related emails and updates</li>
              <li>Send marketing emails if you have subscribed (you may unsubscribe at any time)</li>
              <li>Process payments and maintain billing records</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">4. How We Share Your Information</h2>
            <p className="mb-3">We do not sell your personal information. We share your information only with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Service providers</strong> who help us operate our business (e.g., Supabase for data storage, Stripe for payments, Resend for email, Vercel for hosting). These providers are contractually bound to protect your data.</li>
              <li><strong>GoHighLevel</strong> for marketing email communications if you have subscribed.</li>
              <li><strong>Legal authorities</strong> when required by law or to protect our rights.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide services and comply with legal obligations. If you request deletion of your account or information, we will do so within 30 days except where retention is required by law.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt out of marketing communications at any time</li>
              <li>Data portability where applicable</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:hello@thryvegrowth.co" className="text-brand-700 underline underline-offset-4">hello@thryvegrowth.co</a>.</p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">7. Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including encrypted data storage (Supabase with row-level security), secure HTTPS transmission, and payment processing via PCI-compliant Stripe. No method of transmission over the internet is 100% secure, but we take reasonable steps to protect your data.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">8. Cookies</h2>
            <p>
              Our website uses minimal cookies necessary for site functionality and analytics (Vercel Analytics). We do not use advertising or tracking cookies. You may disable cookies in your browser settings, though this may affect site functionality.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">9. Children&apos;s Privacy</h2>
            <p>
              Our services are not directed to individuals under 18. We do not knowingly collect personal information from minors. If you believe we have collected information from a minor, contact us immediately.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by updating the effective date and, where appropriate, by email. Continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">11. Contact Us</h2>
            <p>
              Questions about this Privacy Policy? Contact us at:
            </p>
            <div className="mt-3 bg-neutral-50 rounded-xl border border-neutral-200 p-4 text-sm">
              <p className="font-semibold text-neutral-900">Thryve Growth Co. LLC</p>
              <p className="text-neutral-600 mt-1">Email: <a href="mailto:hello@thryvegrowth.co" className="text-brand-700 underline underline-offset-4">hello@thryvegrowth.co</a></p>
              <p className="text-neutral-600">Website: thryvegrowth.co</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
