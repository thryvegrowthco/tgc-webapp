import type { Metadata } from "next";
import { NewsletterForm } from "@/components/shared/NewsletterForm";

export const metadata: Metadata = {
  title: "The Thryve Newsletter — Thryve Growth Co.",
  description:
    "One short email a week. Career, leadership, and HR insights you can actually use — no hype, no funnel.",
};

export default function NewsletterLandingPage() {
  return (
    <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 mb-3">
            The Thryve Newsletter
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 leading-tight mb-4">
            One short email. Once a week. From Rachel.
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Career, leadership, and HR perspective from a coach who&apos;d rather help than hype. No funnels. Reply anytime — she reads every one.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8">
          <NewsletterForm variant="full" source="newsletter-landing" />
        </div>

        <p className="text-xs text-neutral-500 text-center mt-6">
          Read by HR leaders, mid-career professionals, and folks rebuilding after a layoff.
        </p>
      </div>
    </section>
  );
}
