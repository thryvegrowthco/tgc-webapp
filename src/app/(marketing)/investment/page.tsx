import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCTA } from "@/components/shared/SectionCTA";

export const metadata: Metadata = {
  title: "Investment",
  description:
    "Transparent pricing for all Thryve Growth Co. services: HR consulting, career coaching, interview prep, resume writing, and job alerts.",
};

const individualServices = [
  {
    category: "Career & Leadership Coaching",
    href: "/services/coaching",
    options: [
      { name: "Single Coaching Session", price: "$125", unit: "per session", note: "" },
      { name: "3-Session Coaching Package", price: "$400", unit: "package", note: "Save $25" },
    ],
  },
  {
    category: "Interview Preparation",
    href: "/services/interview-prep",
    options: [
      { name: "Single Interview Prep Session", price: "$100", unit: "per session", note: "" },
      { name: "2-Session Interview Prep Package", price: "$250", unit: "package", note: "Best value" },
    ],
  },
  {
    category: "Resume & Career Materials",
    href: "/services/resume-materials",
    options: [
      { name: "Resume Review", price: "$75", unit: "one-time", note: "Written feedback" },
      { name: "Full Resume Rewrite", price: "$200", unit: "one-time", note: "Includes intake call + 2 revisions" },
    ],
  },
  {
    category: "Job Alerts & Watchlists",
    href: "/services/job-alerts",
    options: [
      { name: "Job Alerts Monthly Subscription", price: "$50", unit: "/month", note: "Cancel anytime" },
    ],
  },
];

const businessServices = [
  {
    category: "HR Consulting & Team Development",
    href: "/services/hr-consulting",
    options: [
      { name: "HR Consulting, Hourly", price: "$100", unit: "/hour", note: "" },
      { name: "HR Consulting, Project-Based", price: "$500+", unit: "project", note: "Scope determined after assessment" },
    ],
  },
  {
    category: "Culture & Engagement Consulting",
    href: "/services/culture-engagement",
    options: [
      { name: "Culture & Engagement Consulting", price: "$750+", unit: "project", note: "Scope determined after assessment" },
    ],
  },
];

const whyPublic = [
  "You deserve to know what you're getting into before a single conversation",
  "No surprise invoices. Every engagement is scoped and agreed on upfront",
  "Pricing reflects the real-world experience and outcomes you're getting",
  "If it doesn't fit your budget, I'll be honest about that too",
];

export default function InvestmentPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">Pricing</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              Transparent <span className="text-brand-700">Investment</span>
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
              No discovery calls just to find out if you can afford it. Pricing is
              listed publicly because you should know what you&apos;re considering before
              we ever talk.
            </p>
          </div>
        </div>
      </section>

      {/* Individual Pricing */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">For Individuals</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900">Individual Services</h2>
          </div>

          <div className="space-y-6">
            {individualServices.map((svc) => (
              <div key={svc.category} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 bg-neutral-50 border-b border-neutral-200">
                  <p className="font-semibold text-neutral-900">{svc.category}</p>
                  <Link href={svc.href} className="text-sm text-brand-700 font-medium hover:text-brand-800 flex items-center gap-1">
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="divide-y divide-neutral-100">
                  {svc.options.map((opt) => (
                    <div key={opt.name} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-neutral-800">{opt.name}</p>
                        {opt.note && <p className="text-xs text-neutral-500 mt-0.5">{opt.note}</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-display text-xl font-bold text-brand-700">{opt.price}</span>
                        <span className="text-xs text-neutral-500 ml-1">{opt.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button asChild size="lg">
              <Link href="/packages">View Bundled Packages <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Business Pricing */}
      <section className="py-20 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">For Businesses</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900">Organizational Services</h2>
            <p className="text-neutral-500 mt-2 text-sm">Business engagements are scoped after an initial conversation. Starting rates are listed below.</p>
          </div>

          <div className="space-y-6">
            {businessServices.map((svc) => (
              <div key={svc.category} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 bg-neutral-50 border-b border-neutral-200">
                  <p className="font-semibold text-neutral-900">{svc.category}</p>
                  <Link href={svc.href} className="text-sm text-brand-700 font-medium hover:text-brand-800 flex items-center gap-1">
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="divide-y divide-neutral-100">
                  {svc.options.map((opt) => (
                    <div key={opt.name} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-neutral-800">{opt.name}</p>
                        {opt.note && <p className="text-xs text-neutral-500 mt-0.5">{opt.note}</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-display text-xl font-bold text-brand-700">{opt.price}</span>
                        <span className="text-xs text-neutral-500 ml-1">{opt.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Transparent Pricing */}
      <section className="py-16 bg-white border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-xl font-bold text-neutral-900 mb-6">Why Pricing Is Public</h2>
            <ul className="space-y-3">
              {whyPublic.map((item) => (
                <li key={item} className="flex items-start gap-3 text-neutral-600 text-sm leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <SectionCTA
        heading="Ready to Get Started?"
        body="Pick a service, book a call, or just reach out if you have questions. No pressure either way."
        primaryLabel="Book a Call"
        secondaryLabel="View Services"
        secondaryHref="/services"
      />
    </>
  );
}
