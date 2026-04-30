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
              By accessing or using thryvegrowth.co or engaging with services provided by Thryve Growth Co. LLC (&ldquo;Thryve Growth Co.&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use our services.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">2. Services</h2>
            <p>
              Thryve Growth Co. provides HR consulting, career coaching, interview preparation, resume writing, culture consulting, and job alert services. The scope, deliverables, and pricing of each engagement are as described on our website and confirmed in writing prior to commencement. We reserve the right to modify, suspend, or discontinue any service with reasonable notice.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">3. Client Responsibilities</h2>
            <p className="mb-3">To get the most from our services and to enable us to deliver effectively, you agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate, complete information about your situation and goals</li>
              <li>Attend scheduled sessions on time or notify us of cancellations with at least 24 hours&apos; notice</li>
              <li>Complete agreed-upon actions between sessions</li>
              <li>Communicate openly and honestly throughout the engagement</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">4. Payments</h2>
            <p>
              Payment is due at the time of booking or as agreed upon in writing. All payments are processed securely through Stripe. Prices are as listed on our website and confirmed prior to engagement. We reserve the right to update pricing with notice.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">5. Cancellations & Refunds</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Cancellations with 24+ hours notice:</strong> Sessions may be rescheduled at no charge.</li>
              <li><strong>Late cancellations or no-shows:</strong> The session fee is forfeited.</li>
              <li><strong>Packages:</strong> Unused sessions in a package may be applied to future services. Refunds for unused sessions are not available once a package has been started.</li>
              <li><strong>Resume/written deliverables:</strong> Once a project is underway, refunds are not available. Two rounds of revision are included; additional revisions are billed separately.</li>
              <li><strong>Job Alerts subscription:</strong> Cancel anytime. No refunds for the current billing period.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">6. Confidentiality</h2>
            <p>
              We treat all client information as confidential and do not share it with third parties except as described in our Privacy Policy or required by law. We expect the same professional discretion from clients regarding any proprietary information or processes they learn about through their engagement with us.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">7. Nature of Services: Not Legal or Financial Advice</h2>
            <p>
              Our coaching and consulting services are educational and advisory in nature. Nothing we provide constitutes legal, financial, medical, or psychological advice. Results are not guaranteed; outcomes depend on client effort, commitment, and individual circumstances. Testimonials and examples represent individual results and are not typical guarantees.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">8. Intellectual Property</h2>
            <p>
              All content on thryvegrowth.co, including text, design, graphics, tools, and templates, is the property of Thryve Growth Co. LLC and may not be reproduced, distributed, or used without written permission. Materials created specifically for you as a client (resume, action plans, etc.) are yours to use for personal and professional purposes.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Thryve Growth Co. LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services. Our total liability for any claim arising from our services is limited to the amount you paid for the specific service giving rise to the claim.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the United States and the state in which Thryve Growth Co. LLC is registered. Any disputes shall be resolved through good-faith negotiation first, and if necessary, binding arbitration.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">11. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of our services after changes constitutes acceptance of the updated Terms. We will notify you of material changes where practical.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">12. Contact</h2>
            <p>Questions about these Terms? Contact us:</p>
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
