import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo/page-meta";
import { JsonLd } from "@/components/seo/JsonLd";
import { serviceGraph } from "@/lib/seo/schema";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { SectionCTA } from "@/components/shared/SectionCTA";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { contactTopicHref } from "@/lib/contact/topics";

// Owner's framing for this page: an HR consulting service for employers. The
// scope is neutral fact-finding about internal workplace complaints and employee
// conduct concerns, using interviews and relevant workplace records. Keep new
// copy inside that scope.
const DESCRIPTION =
  "Neutral third-party support for small businesses, nonprofits, and other organizations that need to look into a workplace complaint or employee conduct concern.";

export const metadata: Metadata = pageMeta("/services/workplace-investigations", {
  title: "Independent Workplace Investigations",
  description: DESCRIPTION,
});

const included = [
  "Interviews with the people involved and relevant witnesses",
  "Review of relevant workplace records",
  "A written report explaining what the evidence supports and where questions remain",
  "Careful handling of sensitive information throughout the process",
  "A written scope and cost estimate before work begins",
];

const howItWorks = [
  {
    step: "01",
    title: "Reach Out",
    description:
      "Send a brief overview of the concern. You can share sensitive details with me directly when I follow up.",
  },
  {
    step: "02",
    title: "Scope & Estimate",
    description:
      "You'll receive a written scope and cost estimate before work begins.",
  },
  {
    step: "03",
    title: "Fact-Finding",
    description:
      "Depending on the concern, I interview the people involved and relevant witnesses and review workplace records.",
  },
  {
    step: "04",
    title: "Written Report",
    description:
      "I prepare a written report explaining what the evidence supports and where questions remain. Your organization decides how to respond.",
  },
];

const pairsWellWith = [
  { title: "HR Consulting & Team Development", href: "/services/hr-consulting" },
  { title: "Culture & Engagement Consulting", href: "/services/culture-engagement" },
];

export default function WorkplaceInvestigationsPage() {
  const inquireHref = contactTopicHref("workplace-investigation");

  return (
    <>
      <JsonLd
        data={serviceGraph({
          slug: "workplace-investigations",
          name: "Independent Workplace Investigations",
          description: DESCRIPTION,
          offers: [{ name: "Hourly Rate", price: "150", unitText: "HOUR" }],
        })}
      />
      <PageHero
        eyebrow="For Businesses"
        title="Independent Workplace"
        titleAccent="Investigations"
        description={DESCRIPTION}
      >
        <Badge variant="default" className="mt-2">For Businesses &amp; Organizations</Badge>
      </PageHero>

      {/* What This Looks Like */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">
                What This Looks Like
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-8">
                When someone raises a concern at work, it can be hard to look into
                it fairly, especially when the people involved work closely
                together or the concern involves a leader. I provide independent
                workplace investigations for small businesses, nonprofits, and
                other organizations that need a neutral third party to help
                establish what happened.
              </p>
              <p className="text-neutral-600 leading-relaxed mb-8">
                Depending on the concern, I interview the people involved and
                relevant witnesses, review workplace records, and prepare a
                written report explaining what the evidence supports and where
                questions remain. I handle sensitive information with care
                throughout the process. Your organization decides how to respond
                based on the findings.
              </p>

              <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
                <p className="text-sm font-semibold text-brand-800 mb-1">Investment</p>
                <p className="text-2xl font-display font-bold text-brand-700">$150<span className="text-base font-normal text-brand-600">/hour</span></p>
                <p className="text-sm text-brand-700 mt-1">You&apos;ll receive a written scope and cost estimate before work begins.</p>
                <Button asChild className="mt-4 h-auto min-h-11 whitespace-normal py-2 text-left">
                  <Link href={inquireHref}>
                    Inquire About a Workplace Investigation <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </Link>
                </Button>
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

              <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-sm font-semibold text-neutral-800 mb-1">Scope of this service</p>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  This is an HR consulting service for employers. The work is
                  neutral fact-finding about internal workplace complaints and
                  employee conduct concerns, using interviews and relevant
                  workplace records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step) => (
              <div key={step.step}>
                <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center mb-4">
                  <span className="font-display font-bold text-white text-sm">{step.step}</span>
                </div>
                <h3 className="font-display font-bold text-neutral-900 mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
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
        heading="Need a Neutral Third Party?"
        body="Send a brief overview of the concern. You can share sensitive details with me directly when I follow up."
        primaryLabel="Inquire About a Workplace Investigation"
        primaryHref={inquireHref}
        primaryIcon={Mail}
        secondaryLabel="View All Services"
        secondaryHref="/services"
      />
    </>
  );
}
