import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { SectionCTA } from "@/components/shared/SectionCTA";

export const metadata: Metadata = {
  title: "Culture & Engagement Consulting",
  description:
    "Build a culture that's clear, aligned, and sustainable. Strategic culture and engagement consulting for organizations ready to build something that actually lasts.",
};

const included = [
  "Culture assessment: honest look at current state vs. desired state",
  "Employee engagement analysis and gap identification",
  "Values definition and behavioral alignment",
  "Manager accountability and leadership consistency audits",
  "Communication and feedback structure design",
  "Recognition and retention strategy",
  "Culture-building roadmap with clear milestones",
  "Implementation support and check-ins",
];

const whoFor = [
  "Organizations experiencing high turnover or disengagement",
  "Teams where culture has drifted from stated values",
  "Companies going through growth, merger, or leadership change",
  "Leadership teams that want culture to be a real competitive advantage",
  "Organizations where managers are inconsistent in how they lead",
];

const pairsWellWith = [
  { title: "HR Consulting & Team Development", href: "/services/hr-consulting" },
];

export default function CultureEngagementPage() {
  return (
    <>
      <PageHero
        eyebrow="For Businesses"
        title="Culture & Engagement"
        titleAccent="Consulting"
        description="Culture isn't what you say it is. It's what your team experiences every day. I help organizations close the gap between the culture they claim to have and the one they're actually building."
      />

      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">
                What This Looks Like
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-5">
                Culture is built by behavior, not by posters on the wall. The most
                common issue I see? Organizations with stated values that don&apos;t
                match how decisions get made, how managers treat their teams, or
                how performance is rewarded.
              </p>
              <p className="text-neutral-600 leading-relaxed mb-8">
                Culture consulting starts with an honest assessment, not a
                feel-good survey. We look at what&apos;s actually happening, identify
                the gaps, and build a clear plan to close them. No buzzwords,
                no programs that fade after a week.
              </p>

              <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
                <p className="text-sm font-semibold text-brand-800 mb-1">Investment</p>
                <p className="text-2xl font-display font-bold text-brand-700">$750+</p>
                <p className="text-sm text-brand-700 mt-1">Project-based. Scope determined after initial assessment.</p>
                <Link href="/investment" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 mt-3">
                  View full pricing <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-5">
                What&apos;s Included
              </h3>
              <ul className="space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand-600 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-700 text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-8">Who This Is For</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {whoFor.map((item) => (
                <div key={item} className="flex items-start gap-3 bg-white rounded-xl border border-neutral-200 p-4">
                  <span className="h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold mt-0.5">✓</span>
                  <span className="text-sm text-neutral-700 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Pairs Well With</p>
          <div className="flex flex-wrap gap-3">
            {pairsWellWith.map((s) => (
              <Link key={s.href} href={s.href} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all">
                {s.title} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SectionCTA
        heading="Ready to Build Something That Lasts?"
        body="Let's start with an honest conversation about where your culture is and where you want it to go."
        primaryLabel="Book a Call"
        secondaryLabel="View All Services"
        secondaryHref="/services"
      />
    </>
  );
}
