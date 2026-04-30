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
              Thryve Growth Co. LLC (&ldquo;Thryve Growth Co.&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) runs the website thryvegrowth.co and offers HR consulting, career coaching, and related services. This page explains, in plain language, what information we collect when you work with us, how we use it, and how we keep it safe.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We only collect information you share with us directly. That usually includes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your name, email address, and phone number when you reach out or book a call</li>
              <li>Professional details like your job title, company, or career goals once we start working together</li>
              <li>Payment details, processed securely through Stripe. We never see or store your card number</li>
              <li>Anything you send us by email or through a contact form</li>
              <li>Account details if you create a client dashboard login</li>
            </ul>
            <p className="mt-3">We also pick up a small amount of technical information automatically, like your browser type, pages you visit, and where you came from. That comes from standard web analytics and helps us understand how the site is used.</p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use what you share with us to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, schedule, and improve our services</li>
              <li>Stay in touch about your inquiries, bookings, and ongoing work together</li>
              <li>Send service-related emails and updates</li>
              <li>Send marketing emails if you&apos;ve subscribed (you can unsubscribe any time)</li>
              <li>Process payments and keep billing records</li>
              <li>Meet our legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">4. How We Share Your Information</h2>
            <p className="mb-3">We never sell your personal information. We only share it with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Trusted service providers</strong> who help us run the business (Supabase for data storage, Stripe for payments, Resend for email, and Vercel for hosting). They&apos;re contractually required to keep your data safe.</li>
              <li><strong>GoHighLevel</strong> for marketing emails, but only if you&apos;ve subscribed.</li>
              <li><strong>Legal authorities</strong> when the law requires it or when we need to protect our rights.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">5. Data Retention</h2>
            <p>
              We hold on to your information only as long as we need it to provide services and meet legal obligations. If you ever ask us to delete your account or your data, we will take care of that within 30 days, unless the law requires us to keep it longer.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>See what personal information we have about you</li>
              <li>Ask us to correct anything that&apos;s inaccurate</li>
              <li>Request that we delete your information</li>
              <li>Unsubscribe from marketing emails at any time</li>
              <li>Receive a copy of your data where applicable</li>
            </ul>
            <p className="mt-3">If you want to exercise any of these rights, just email us at <a href="mailto:hello@thryvegrowth.co" className="text-brand-700 underline underline-offset-4">hello@thryvegrowth.co</a> and we&apos;ll take care of it.</p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">7. Security</h2>
            <p>
              We take reasonable, industry-standard steps to keep your information safe. That includes encrypted data storage in Supabase with row-level security, secure HTTPS connections, and PCI-compliant payment processing through Stripe. No system on the internet is ever 100 percent secure, but we work hard to protect your data and treat it with care.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">8. Cookies</h2>
            <p>
              We only use the cookies our site needs to function and a small set for basic analytics through Vercel. We don&apos;t run advertising or third-party tracking cookies. You can turn cookies off in your browser settings if you prefer, though some parts of the site may not work as smoothly.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">9. Children&apos;s Privacy</h2>
            <p>
              Our services are designed for adults and aren&apos;t intended for anyone under 18. We don&apos;t knowingly collect personal information from minors. If you believe a minor has shared information with us, please reach out and we&apos;ll remove it right away.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make a meaningful change, we&apos;ll update the effective date above and, where it makes sense, send you a note by email. Continuing to use our services after a change means you accept the updated policy.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-3">11. Contact Us</h2>
            <p>
              Have a question about this policy? We&apos;re happy to hear from you.
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
