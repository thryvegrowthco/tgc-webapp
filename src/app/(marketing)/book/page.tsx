import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Clock, CheckCircle2 } from "lucide-react";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { RachelProfileCircle } from "@/components/shared/RachelPhoto";

export const metadata: Metadata = {
  title: "Book a Call",
  description:
    "Book a session with Rachel at Thryve Growth Co. Select your service, choose a time, and pay securely via Stripe.",
};

const whatToExpect = [
  "A real conversation, no sales pressure",
  "Honest feedback about whether I can help",
  "Clarity on next steps, whatever they may be",
  "Confirmation email sent immediately after booking",
];

export default function BookPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-14 lg:py-20 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">
                Let&apos;s Connect
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              Book a Session
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Select your service, pick a time, and pay securely. You&apos;ll receive
              a confirmation email with everything you need.
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
                    <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-600">
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
                  <p className="text-sm font-semibold text-brand-800">After booking</p>
                </div>
                <p className="text-sm text-brand-700 leading-relaxed">
                  You&apos;ll receive a confirmation email immediately with your booking details and a video call link before your session.
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
                  Questions about pricing?
                </p>
                <Link href="/investment" className="text-sm text-brand-700 font-medium hover:text-brand-800">
                  View full pricing →
                </Link>
              </div>
            </div>

            {/* Booking flow */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
                <BookingFlow />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
