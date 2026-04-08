import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { SectionCTA } from "@/components/shared/SectionCTA";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "HR Consulting & Team Development",
  description:
    "Strategic HR consulting for growing organizations. Build structure, develop leaders, and create the HR foundation your team needs to perform.",
};

const included = [
  "HR infrastructure audit — what's working, what isn't, what's missing",
  "Role clarity and accountability systems",
  "Performance management framework design and implementation",
  "Hiring strategy, process design, and interview frameworks",
  "Manager coaching and leadership development",
  "Onboarding programs that actually set people up for success",
  "Culture and values alignment",
  "HR policy review and development",
  "Ongoing strategic HR advisory support",
];

const whoFor = [
  "Small to mid-size companies without a dedicated HR leader",
  "Organizations that have outgrown their current HR setup",
  "Leadership teams dealing with people management challenges",
  "Companies preparing for growth, restructuring, or change",
  "Founders who know they need HR support but don't want a full-time hire",
];

const pairsWellWith = [
  { title: "Culture & Engagement Consulting", href: "/services/culture-engagement" },
  { title: "Career & Leadership Coaching", href: "/services/coaching" },
];

export default function HRConsultingPage() {
  return (
    <>
      <PageHero
        eyebrow="For Businesses"
        title="HR Consulting &"
        titleAccent="Team Development"
        description="Strategic HR support that goes beyond policy and compliance. I work with growing organizations to build the people infrastructure, leadership capability, and team culture that lets your business actually scale."
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
                HR consulting with Thryve Growth Co. is not about writing handbooks
                that sit in a drawer. It&apos;s about building real infrastructure — the
                kind that helps your team operate with clarity, your managers lead
                with confidence, and your organization grow sustainably.
              </p>
              <p className="text-neutral-600 leading-relaxed mb-8">
                Every engagement starts with an honest assessment of where you are.
                From there we build a plan that&apos;s specific to your organization,
                your team, and where you want to go.
              </p>

              <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
                <p className="text-sm font-semibold text-brand-800 mb-1">Investment</p>
                <p className="text-2xl font-display font-bold text-brand-700">$100<span className="text-base font-normal text-brand-600">/hour</span></p>
                <p className="text-sm text-brand-700 mt-1">Project-based pricing available starting at $500</p>
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

      {/* Who This Is For */}
      <section className="py-20 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-8">
              Who This Is For
            </h2>
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
        heading="Let's Talk About Your Team"
        body="Every organization is different. Tell me what's going on and we'll figure out the right approach together."
        primaryLabel="Book a Call"
        secondaryLabel="View All Services"
        secondaryHref="/services"
      />
    </>
  );
}
