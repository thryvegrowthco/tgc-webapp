import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo/page-meta";
import Link from "next/link";
import { Mail, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { BookingFlow, type BookingAgreementState } from "@/components/booking/BookingFlow";
import { RachelProfileCircle } from "@/components/shared/RachelPhoto";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgreement, getLatestSigningForUser } from "@/app/actions/legal";

export const metadata: Metadata = pageMeta("/book", {
  title: "Book a Session",
  description:
    "Sessions with Rachel Dietz are booked by invitation after a free 30-minute consultation. Existing clients can sign in to book.",
});

const whatToExpect = [
  "A real conversation, no sales pressure",
  "Honest feedback about whether I can help",
  "Clarity on next steps, whatever they may be",
  "Confirmation email sent immediately after booking",
];

export default async function BookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Booking is invitation-only. Signed-out visitors start with the free
  // consultation; after that, Rachel emails a personal booking link. Only
  // signed-in clients (all accounts come from Rachel's invitations) see the
  // live BookingFlow below.
  if (!user) {
    return (
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 sm:p-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">
                Let&apos;s Connect
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 leading-tight mb-4">
              Book a Session
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Sessions are booked by invitation. New clients start with a free
              30-minute consultation. After we talk, Rachel will email you a
              personal booking link with times that work.
            </p>

            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/consultation">
                  Book a free 30-minute consultation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-neutral-500">
              Already have a booking link? Use the link in your invitation email.
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Existing client?{" "}
              <Link
                href="/login?redirect=/book"
                className="text-brand-700 font-medium hover:text-brand-800"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  const [currentAgreement, latestSigning] = await Promise.all([
    getCurrentAgreement(),
    user ? getLatestSigningForUser(user.id) : Promise.resolve(null),
  ]);
  const agreementState: BookingAgreementState = {
    isAuthenticated: Boolean(user),
    currentVersion: currentAgreement?.version_label ?? null,
    signedVersion: latestSigning?.version_label ?? null,
    signedAt: latestSigning?.signed_at ?? null,
  };

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
              Pick a session type and a time that works. You&apos;ll receive a
              confirmation email with everything you need.
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
                <BookingFlow agreementState={agreementState} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
