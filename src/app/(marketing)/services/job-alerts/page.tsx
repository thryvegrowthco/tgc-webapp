import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Bell, Search, User } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { SectionCTA } from "@/components/shared/SectionCTA";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Job Alerts & Watchlists",
  description:
    "Curated job matches delivered to you — filtered to your goals, your experience, and your preferences. Manual curation by Rachel plus automated job board feeds.",
};

const howItWorks = [
  {
    step: "01",
    title: "Set Up Your Profile",
    description: "Tell me what you're looking for — target roles, industries, locations, salary range, remote preference, and any other criteria that matter to you.",
  },
  {
    step: "02",
    title: "Rachel Reviews & Curates",
    description: "I personally review matches and add roles I think fit your goals — including jobs I spot that you might not find on your own.",
  },
  {
    step: "03",
    title: "Automated Feed Runs",
    description: "Your watchlist is also populated from live job board sources, filtered to your profile criteria and deduplicated automatically.",
  },
  {
    step: "04",
    title: "You Review & Act",
    description: "Log in to your dashboard, review your matches, track your applications, and update statuses as you move through your search.",
  },
];

const included = [
  "Personalized watchlist profile setup",
  "Rachel's manual curation of relevant job matches",
  "Automated job board feed filtered to your criteria",
  "Dashboard to track matches and application statuses",
  "Ongoing refinement as your search evolves",
  "New matches added regularly",
];

const pairsWellWith = [
  { title: "Career & Leadership Coaching", href: "/services/coaching" },
  { title: "Interview Preparation", href: "/services/interview-prep" },
  { title: "Resume & Career Materials", href: "/services/resume-materials" },
];

export default function JobAlertsPage() {
  return (
    <>
      <PageHero
        eyebrow="For Individuals"
        title="Job Alerts &"
        titleAccent="Watchlists"
        description="Stop scrolling job boards for hours. I'll surface the right opportunities for you — curated manually and pulled from live feeds — so you can focus on applying strategically instead of searching endlessly."
      />

      {/* How It Works */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-5">What&apos;s Included</h3>
              <ul className="space-y-3 mb-8">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand-600 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-700 text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              {/* Human + Automated */}
              <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-brand-100 rounded-lg"><User className="h-4 w-4 text-brand-700" /></div>
                  <p className="font-semibold text-brand-800">Human Curation</p>
                </div>
                <p className="text-sm text-brand-700 leading-relaxed">
                  Rachel manually reviews and adds matches — including roles she spots that fit your goals, even if they don&apos;t show up in automated searches.
                </p>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-neutral-200 rounded-lg"><Search className="h-4 w-4 text-neutral-600" /></div>
                  <p className="font-semibold text-neutral-800">Automated Feed</p>
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Live job board sources are queried automatically and filtered to your watchlist criteria, so you&apos;re never missing active postings.
                </p>
              </div>

              {/* Pricing */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-brand-50 rounded-lg"><Bell className="h-4 w-4 text-brand-600" /></div>
                  <p className="font-semibold text-neutral-800">Investment</p>
                </div>
                <p className="text-2xl font-display font-bold text-brand-700">$50<span className="text-base font-normal text-neutral-500">/month</span></p>
                <p className="text-sm text-neutral-500 mt-1">Cancel anytime.</p>
                <div className="mt-4">
                  <Button asChild size="sm">
                    <Link href="/book">Get Started</Link>
                  </Button>
                </div>
              </div>
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
        heading="Ready to Let Someone Else Do the Searching?"
        body="Set up your watchlist and get curated job matches delivered to your dashboard — without the daily scroll."
        primaryLabel="Get Started"
        secondaryLabel="View Pricing"
        secondaryHref="/investment"
      />
    </>
  );
}
