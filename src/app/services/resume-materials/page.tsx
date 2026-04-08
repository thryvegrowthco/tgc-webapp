import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { SectionCTA } from "@/components/shared/SectionCTA";

export const metadata: Metadata = {
  title: "Resume & Career Materials",
  description:
    "Resume review, full rewrite, LinkedIn optimization, and cover letters — career materials that actually tell your story the right way.",
};

const options = [
  {
    title: "Resume Review",
    price: "$75",
    description: "I review your existing resume and provide detailed written feedback — what's working, what needs to change, and how to position yourself more effectively.",
    includes: ["Written feedback on content and formatting", "Positioning and narrative review", "ATS optimization notes", "Prioritized list of changes to make"],
  },
  {
    title: "Full Resume Rewrite",
    price: "$200",
    description: "Starting from your existing resume and a 30-minute intake call, I rewrite your resume from scratch — clean, clear, and positioned for where you want to go.",
    includes: ["30-minute intake call", "Complete rewrite (1-2 page)", "ATS-optimized format", "Two rounds of revisions", "Final file in Word + PDF"],
  },
];

const addOns = [
  "LinkedIn profile optimization",
  "Cover letter (per role or template)",
  "Professional bio",
];

const pairsWellWith = [
  { title: "Career & Leadership Coaching", href: "/services/coaching" },
  { title: "Interview Preparation", href: "/services/interview-prep" },
];

export default function ResumeMaterialsPage() {
  return (
    <>
      <PageHero
        eyebrow="For Individuals"
        title="Resume & Career"
        titleAccent="Materials"
        description="Your resume is not just a list of jobs — it's a story about what you bring and where you're headed. I'll help you tell that story in a way that actually lands."
      />

      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">
            What I Offer
          </h2>
          <p className="text-neutral-600 leading-relaxed mb-12 max-w-2xl">
            As someone who has reviewed thousands of resumes as an HR professional
            and hiring manager, I know exactly what gets attention — and what gets
            you passed over. My resume work is practical, direct, and built around
            helping you compete for the roles you actually want.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {options.map((opt) => (
              <div key={opt.title} className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-display text-xl font-bold text-neutral-900">{opt.title}</h3>
                  <span className="font-display text-2xl font-bold text-brand-700">{opt.price}</span>
                </div>
                <p className="text-neutral-600 text-sm leading-relaxed mb-6">{opt.description}</p>
                <ul className="space-y-2">
                  {opt.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-600">
                      <CheckCircle2 className="h-4 w-4 text-brand-600 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-3">Add-On Services</p>
            <div className="flex flex-wrap gap-3">
              {addOns.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-neutral-200 px-4 py-2 text-sm text-neutral-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
                  {item}
                </span>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-3">Pricing for add-ons discussed on call.</p>
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
        heading="Ready to Rewrite Your Story?"
        body="Start with a call so I can understand your goals, then we'll figure out which option makes the most sense."
        primaryLabel="Book a Call"
        secondaryLabel="View Full Pricing"
        secondaryHref="/investment"
      />
    </>
  );
}
