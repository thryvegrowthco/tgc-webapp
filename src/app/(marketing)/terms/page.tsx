import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Thryve Growth Co. LLC",
};

export default function TermsPage() {
  const effectiveDate = "April 1, 2025";

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-neutral-500 mb-10">Effective date: {effectiveDate}</p>

        <div className="space-y-8 text-neutral-700 text-sm leading-relaxed">

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">1. Agreement to Terms</h2>
            <p>
              By using thryvegrowth.co or working with Thryve Growth Co. LLC (&ldquo;Thryve Growth Co.&rdquo;, &ldquo;we&rdquo;, or &ldquo;us&rdquo;), you agree to these Terms of Service. If anything here doesn&apos;t feel right for you, please don&apos;t use our services.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">2. Services</h2>
            <p>
              Thryve Growth Co. offers HR consulting, career coaching, interview preparation, resume writing, culture consulting, and job alert services. The scope, deliverables, and pricing for each engagement are described on our website and confirmed in writing before we begin. We may modify, pause, or discontinue any service with reasonable notice.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">3. Client Responsibilities</h2>
            <p className="mb-3">To get the most out of our work together, we ask that you:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Share accurate, complete information about your situation and goals</li>
              <li>Show up to scheduled sessions on time, or let us know at least 24 hours ahead if you need to reschedule</li>
              <li>Follow through on the actions we agree on between sessions</li>
              <li>Stay open and honest with us throughout the engagement</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">4. Payments</h2>
            <p>
              Payment is due at the time of booking or as agreed in writing. All payments are processed securely through Stripe. Prices are listed on our website and confirmed before any engagement begins. If pricing changes in the future, we&apos;ll let you know.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">5. Cancellations and Refunds</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Cancellations with 24 or more hours of notice:</strong> Sessions can be rescheduled at no cost.</li>
              <li><strong>Late cancellations or no-shows:</strong> The session fee is forfeited.</li>
              <li><strong>Packages:</strong> Unused sessions in a package can be applied to future services. Refunds aren&apos;t available once a package has started.</li>
              <li><strong>Resume and written deliverables:</strong> Once we&apos;re underway, refunds aren&apos;t available. Two rounds of revisions are included; any extra rounds are billed separately.</li>
              <li><strong>Job Alerts subscription:</strong> Cancel anytime. We don&apos;t issue refunds for the current billing period.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">6. Confidentiality</h2>
            <p>
              Anything you share with us stays confidential. We don&apos;t share client information with third parties unless our Privacy Policy says so or the law requires it. We ask the same professional discretion from clients about anything proprietary they learn through working with us.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">7. Nature of Services: Not Legal or Financial Advice</h2>
            <p>
              Our coaching and consulting services are educational and advisory. Nothing we provide is legal, financial, medical, or psychological advice. We don&apos;t guarantee specific results. Outcomes depend on your effort, commitment, and circumstances. Any testimonials or examples reflect individual experiences and aren&apos;t typical guarantees.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">8. Intellectual Property</h2>
            <p>
              Everything on thryvegrowth.co (text, design, graphics, tools, and templates) belongs to Thryve Growth Co. LLC and may not be reproduced, distributed, or reused without written permission. Anything we create specifically for you as a client (your resume, action plan, and so on) is yours to use for personal and professional purposes.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">9. Limitation of Liability</h2>
            <p>
              To the fullest extent the law allows, Thryve Growth Co. LLC isn&apos;t liable for any indirect, incidental, special, or consequential damages tied to your use of our services. Our total liability for any claim is limited to what you paid for the specific service the claim is about.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the United States and the state where Thryve Growth Co. LLC is registered. If a dispute comes up, we&apos;ll start with a good-faith conversation. If that doesn&apos;t resolve things, the matter goes to binding arbitration.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">11. Changes to These Terms</h2>
            <p>
              These Terms may change from time to time. Continuing to use our services after a change means you accept the updated Terms. We&apos;ll let you know about meaningful changes whenever it&apos;s practical.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">12. Contact</h2>
            <p>Have a question about these Terms? We&apos;re glad to hear from you.</p>
            <div className="mt-3 bg-neutral-50 rounded-xl border border-neutral-200 p-4">
              <p className="font-semibold text-neutral-900">Thryve Growth Co. LLC</p>
              <p className="text-neutral-600 mt-1">Email: <a href="mailto:hello@thryvegrowth.co" className="text-brand-700 underline underline-offset-4">hello@thryvegrowth.co</a></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
