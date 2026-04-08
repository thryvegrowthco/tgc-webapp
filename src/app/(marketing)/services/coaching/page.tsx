import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { SectionCTA } from "@/components/shared/SectionCTA";

export const metadata: Metadata = {
  title: "Career & Leadership Coaching",
  description:
    "1:1 career and leadership coaching grounded in real HR experience. Get clarity, build confidence, and move forward with a strategy that actually fits your life.",
};

const included = [
  "1:1 coaching sessions (virtual)",
  "Career clarity — defining what you actually want and why",
  "Goal setting with real accountability built in",
  "Career transition strategy and planning",
  "Leadership skill development for new and experienced managers",
  "Feedback on how you show up — honest, not just encouraging",
  "Action plans you can execute between sessions",
  "Support navigating workplace challenges and difficult situations",
];

const whoFor = [
  "Professionals feeling stuck or unclear about their next move",
  "People navigating a career transition or industry change",
  "New managers stepping into leadership for the first time",
  "Experienced leaders ready to operate at the next level",
  "High performers who want more — more clarity, more impact, more intention",
  "Anyone who wants real accountability alongside real support",
];

const pairsWellWith = [
  { title: "Interview Preparation", href: "/services/interview-prep" },
  { title: "Resume & Career Materials", href: "/services/resume-materials" },
  { title: "Job Alerts & Watchlists", href: "/services/job-alerts" },
];

export default function CoachingPage() {
  return (
    <>
      <PageHero
        eyebrow="For Individuals"
        title="Career & Leadership"
        titleAccent="Coaching"
        description="Coaching that's actually grounded in how hiring, leadership, and career growth work in the real world — not just motivational frameworks. Get clear on where you want to go, build a plan to get there, and have someone in your corner who will hold you to it."
      />

      {/* What's Included */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">
                What This Looks Like
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-5">
                Coaching with me isn&apos;t about affirmations and vision boards. It&apos;s
                about honest conversations, clear strategy, and real accountability.
                We dig into where you actually are, get clear on where you want to
                go, and build a practical plan to get there.
              </p>
              <p className="text-neutral-600 leading-relaxed mb-8">
                I bring 10+ years of actual HR experience into every session — which
                means I understand how careers really work, what hiring managers
                are actually thinking, and how to help you navigate workplace
                dynamics with confidence.
              </p>

              <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
                <p className="text-sm font-semibold text-brand-800 mb-3">Investment</p>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-neutral-700">Single Session</span>
                    <span className="font-display font-bold text-brand-700 text-lg">$125</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-brand-200 pt-2">
                    <span className="text-sm text-neutral-700">3-Session Package</span>
                    <span className="font-display font-bold text-brand-700 text-lg">$400 <span className="text-sm font-normal text-brand-600">save $25</span></span>
                  </div>
                </div>
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
              <Link key={s.href} href={s.href} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all">
                {s.title} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SectionCTA
        heading="Ready to Move Forward?"
        body="Let's start with a conversation. Tell me where you are and what you're trying to figure out."
        primaryLabel="Book a Call"
        secondaryLabel="View Packages"
        secondaryHref="/packages"
      />
    </>
  );
}
