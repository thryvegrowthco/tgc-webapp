import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { SectionCTA } from "@/components/shared/SectionCTA";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Recruitment & Candidate Screening",
  description:
    "Flexible recruitment support for small businesses and organizations. Resume screening, candidate phone screens, interview question development, and hiring process consultation — tailored to your needs.",
};

const included = [
  "Resume and application screening",
  "Candidate phone screenings",
  "Interview question development",
  "Interview scheduling and coordination",
  "Candidate evaluations and recommendations",
  "Recruitment process consultation",
];

const whoFor = [
  "Small businesses scaling up without a dedicated recruiter",
  "Nonprofits that need help running a thoughtful hiring process",
  "Organizations hiring for one or two key roles, not a constant pipeline",
  "Hiring managers who want a second set of eyes on candidates",
];

const pairsWellWith = [
  { title: "HR Consulting & Team Development", href: "/services/hr-consulting" },
  { title: "Culture & Engagement Consulting", href: "/services/culture-engagement" },
];

export default function RecruitmentScreeningPage() {
  return (
    <>
      <PageHero
        eyebrow="For Businesses"
        title="Recruitment &"
        titleAccent="Candidate Screening"
        description="Finding qualified candidates takes time. Thryve Growth Co. provides flexible recruitment support to help small businesses and organizations attract, screen, and evaluate candidates with confidence."
      >
        <Badge variant="default" className="mt-2">For Businesses &amp; Organizations</Badge>
      </PageHero>

      {/* What's Included */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">
                What This Looks Like
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-8">
                Whether you need help reviewing applications, coordinating
                interviews, developing interview questions, or identifying top
                candidates, support can be tailored to meet your organization&apos;s
                needs.
              </p>
              <p className="text-neutral-600 leading-relaxed mb-8">
                Every engagement starts with a conversation about the role, your
                timeline, and where you need the most help. From there we build a
                plan that fits the way your team actually hires.
              </p>

              <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
                <p className="text-sm font-semibold text-brand-800 mb-1">Investment</p>
                <p className="text-2xl font-display font-bold text-brand-700">Custom quote</p>
                <p className="text-sm text-brand-700 mt-1">Contact for a customized quote based on your hiring needs.</p>
                <Link href="/consultation" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 mt-3">
                  Request a quote <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-5">
                Services May Include
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

      {/* Who This Is For */}
      <section className="py-20 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
              Who This Is For
            </h2>
            <p className="text-neutral-500 mb-8 text-sm">
              Ideal for small businesses, nonprofits, and organizations that need hiring support without a full-time recruiter.
            </p>
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

      {/* Pairs Well With */}
      <section className="py-12 bg-white border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Pairs Well With</p>
          <div className="flex flex-wrap gap-3">
            {pairsWellWith.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all"
              >
                {s.title} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SectionCTA
        heading="Let's Talk About Your Hiring"
        body="Tell me about the role and where you need the most support. I'll come back with a quote and a plan."
        secondaryLabel="View All Services"
        secondaryHref="/services"
      />
    </>
  );
}
