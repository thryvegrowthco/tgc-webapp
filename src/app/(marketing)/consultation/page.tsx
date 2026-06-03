import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { ConsultationForm } from "@/components/marketing/ConsultationForm";
import { RachelProfileCircle } from "@/components/shared/RachelPhoto";

export const metadata: Metadata = {
  title: "Book a Free 30-Minute Consultation Call",
  description:
    "Request a free 30-minute consultation call with Rachel at Thryve Growth Co. No payment, no pressure — just an honest conversation about what you're working through.",
};

const whatToExpect = [
  "A real conversation, no sales pressure",
  "Honest feedback about whether I can help",
  "Clarity on next steps — whether that's working together or not",
  "Reply within 1–2 business days with available times",
];

export default function ConsultationPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-14 lg:py-20 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <ShieldCheck className="h-4 w-4 text-brand-700" />
              <span className="text-sm font-semibold text-brand-800 tracking-wide">
                100% Free · No Payment Required
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              Book a Free 30-Minute Consultation Call
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Tell me a little about what&apos;s going on and I&apos;ll get back to you
              with a few times that work for a free 30-minute call. No pressure, no sales
              pitch — just an honest conversation.
            </p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">
              {/* Rachel intro */}
              <div className="flex items-center gap-4">
                <RachelProfileCircle size="lg" />
                <div>
                  <p className="font-semibold text-neutral-900">Rachel</p>
                  <p className="text-sm text-brand-700">Founder, Thryve Growth Co.</p>
                </div>
              </div>

              {/* What to expect */}
              <div>
                <h2 className="font-display text-base font-bold text-neutral-900 mb-3">
                  What to expect
                </h2>
                <ul className="space-y-2.5">
                  {whatToExpect.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-neutral-600"
                    >
                      <CheckCircle2 className="h-4 w-4 text-brand-600 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Response time */}
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="h-4 w-4 text-brand-700" />
                  <p className="text-sm font-semibold text-brand-800">After you submit</p>
                </div>
                <p className="text-sm text-brand-700 leading-relaxed">
                  I&apos;ll personally review what you sent and reply within 1–2
                  business days with a few times that work. The call itself is 30 minutes
                  over video.
                </p>
              </div>

              {/* Email fallback */}
              <div className="rounded-xl border border-neutral-200 p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Mail className="h-4 w-4 text-neutral-500" />
                  <p className="text-sm font-semibold text-neutral-700">Prefer email?</p>
                </div>
                <p className="text-sm text-neutral-600">
                  Reach me at{" "}
                  <a
                    href="mailto:hello@thryvegrowth.co"
                    className="text-brand-700 font-medium hover:text-brand-800 underline underline-offset-4"
                  >
                    hello@thryvegrowth.co
                  </a>
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">
                  Ready to book a paid session?
                </p>
                <Link
                  href="/book"
                  className="text-sm text-brand-700 font-medium hover:text-brand-800"
                >
                  Skip the consult and book directly →
                </Link>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
                <p className="text-sm font-semibold text-brand-700 mb-2">
                  Request your free 30-minute consultation call below
                </p>
                <h2 className="font-display text-2xl font-bold text-neutral-900 mb-6">
                  Tell me a little about what&apos;s going on
                </h2>
                <ConsultationForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
