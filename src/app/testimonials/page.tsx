import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Client Testimonials",
  description: "What clients say about working with Thryve Growth Co.",
  robots: {
    index: false,
    follow: false,
  },
};

// Placeholder — real testimonials added when collected
const placeholders = [
  { initials: "J.S.", role: "Marketing Manager", service: "Career Coaching" },
  { initials: "M.T.", role: "Operations Director", service: "HR Consulting" },
  { initials: "A.R.", role: "Software Engineer", service: "Interview Prep" },
  { initials: "K.L.", role: "HR Business Partner", service: "Resume Rewrite" },
  { initials: "D.W.", role: "VP of People", service: "Culture Consulting" },
  { initials: "C.P.", role: "Product Manager", service: "Career Coaching" },
];

export default function TestimonialsPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">Testimonials</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              What Clients Say
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Real feedback from real clients. No embellishment, no cherry-picking.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Coming soon notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-12 text-center">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Testimonials coming soon.</span>{" "}
              This page will be populated with real client feedback. Currently in collection.
            </p>
          </div>

          {/* Placeholder cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {placeholders.map((p) => (
              <div key={p.initials} className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-brand-200 flex items-center justify-center">
                    <span className="text-brand-800 font-bold text-xs">{p.initials}</span>
                  </div>
                  <div>
                    <div className="h-3 w-24 bg-neutral-200 rounded mb-1" />
                    <div className="h-2.5 w-16 bg-neutral-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-2.5 bg-neutral-200 rounded w-full" />
                  <div className="h-2.5 bg-neutral-200 rounded w-full" />
                  <div className="h-2.5 bg-neutral-200 rounded w-3/4" />
                </div>
                <span className="inline-block text-xs bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">
                  {p.service}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <p className="text-neutral-600 mb-6">
              Ready to become a client? Let&apos;s start a conversation.
            </p>
            <Button asChild size="lg">
              <Link href="/book">
                Book a Call <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
