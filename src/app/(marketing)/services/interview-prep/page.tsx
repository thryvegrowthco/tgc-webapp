import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { SectionCTA } from "@/components/shared/SectionCTA";

export const metadata: Metadata = {
  title: "Interview Preparation",
  description:
    "Walk into your next interview prepared and confident. Real mock interviews, honest feedback, and strategy from someone who's been on both sides of the table.",
};

const included = [
  "Pre-session review of your resume, role, and target company",
  "Mock interview (behavioral, situational, role-specific)",
  "Real-time and post-session feedback — honest, not sugarcoated",
  "STAR method coaching for behavioral questions",
  "Strategy for answering tough questions (gaps, salary, weaknesses)",
  "How to research and prep for specific companies",
  "Questions to ask — and why they matter",
  "Follow-up strategy and thank-you note guidance",
];

const whoFor = [
  "Job seekers preparing for an upcoming interview",
  "Career changers navigating unfamiliar interview formats",
  "Professionals who know their stuff but freeze under pressure",
  "Anyone who's been out of the job market and needs to shake off the rust",
  "Recent grads entering a competitive job market",
];

const pairsWellWith = [
  { title: "Career & Leadership Coaching", href: "/services/coaching" },
  { title: "Resume & Career Materials", href: "/services/resume-materials" },
  { title: "Job Alerts & Watchlists", href: "/services/job-alerts" },
];

export default function InterviewPrepPage() {
  return (
    <>
      <PageHero
        eyebrow="For Individuals"
        title="Interview"
        titleAccent="Preparation"
        description="Most people practice with friends who tell them what they want to hear. I'll tell you what you actually need to hear — and help you fix it before the real thing."
      />

      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">
                What This Looks Like
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-5">
                I&apos;ve been on both sides of the interview table. As an HR professional
                and hiring manager, I know exactly what interviewers are listening
                for — and more importantly, what makes candidates stand out vs.
                blend in.
              </p>
              <p className="text-neutral-600 leading-relaxed mb-8">
                Interview prep with me is not about scripting answers. It&apos;s about
                helping you communicate clearly, confidently, and authentically —
                and walking in with a strategy, not just hope.
              </p>

              <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
                <p className="text-sm font-semibold text-brand-800 mb-3">Investment</p>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-neutral-700">Single Session</span>
                    <span className="font-display font-bold text-brand-700 text-lg">$100</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-brand-200 pt-2">
                    <span className="text-sm text-neutral-700">2-Session Package</span>
                    <span className="font-display font-bold text-brand-700 text-lg">$250 <span className="text-sm font-normal text-brand-600">best value</span></span>
                  </div>
                </div>
                <Link href="/investment" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 mt-3">
                  View full pricing <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-5">What&apos;s Included</h3>
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
        heading="Have an Interview Coming Up?"
        body="Let's get you ready. Book a session and we'll make sure you walk in prepared."
        primaryLabel="Book a Session"
        secondaryLabel="View Pricing"
        secondaryHref="/investment"
      />
    </>
  );
}
