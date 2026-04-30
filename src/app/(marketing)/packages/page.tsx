import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCTA } from "@/components/shared/SectionCTA";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Bundled coaching and career packages from Thryve Growth Co., built for more support, more value, and more momentum.",
};

const packages = [
  {
    name: "Coaching Package",
    subtitle: "3-Session Coaching Series",
    price: "$400",
    savings: "Save $25 vs. individual sessions",
    badgeColor: "bg-brand-600",
    description:
      "Three focused 1:1 coaching sessions designed to build momentum. Whether you're navigating a transition, developing as a leader, or working through what's next, three sessions gives us enough time to get clear and start moving.",
    includes: [
      "3 x 1-hour coaching sessions (virtual)",
      "Pre-session prep materials",
      "Accountability check-ins between sessions",
      "Post-series action plan",
      "Email support between sessions",
    ],
    bestFor: "Career transitions, leadership development, goal setting",
    href: "/book",
    featured: true,
  },
  {
    name: "Interview Prep Package",
    subtitle: "2-Session Interview Series",
    price: "$250",
    savings: "Best value for interview prep",
    badgeColor: "bg-neutral-800",
    description:
      "Two sessions dedicated to getting you interview-ready. The first session focuses on strategy, story, and the basics. The second is a full mock interview with real feedback so you can walk in prepared.",
    includes: [
      "Session 1: Strategy, framing, and behavioral question prep",
      "Session 2: Full mock interview with real-time feedback",
      "Written post-session feedback",
      "STAR method coaching",
      "Question bank for your target role/industry",
    ],
    bestFor: "Upcoming interviews, career changers, returning to the job market",
    href: "/book",
    featured: false,
  },
];

const buildYourOwn = [
  { label: "Career Coaching Session", price: "$125", href: "/services/coaching" },
  { label: "Interview Prep Session", price: "$100", href: "/services/interview-prep" },
  { label: "Resume Review", price: "$75", href: "/services/resume-materials" },
  { label: "Full Resume Rewrite", price: "$200", href: "/services/resume-materials" },
  { label: "Job Alerts (monthly)", price: "$50/mo", href: "/services/job-alerts" },
];

export default function PackagesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">Packages</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              More Support. <span className="text-brand-700">More Momentum.</span>
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Bundled packages are designed for people who are serious about
              moving forward, and who understand that real progress takes more
              than a single conversation.
            </p>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`rounded-2xl border p-8 shadow-sm relative overflow-hidden ${
                  pkg.featured
                    ? "border-brand-300 bg-white ring-2 ring-brand-200"
                    : "border-neutral-200 bg-white"
                }`}
              >
                {pkg.featured && (
                  <div className="absolute top-0 right-0 bg-brand-600 text-white text-xs font-semibold px-4 py-1.5 rounded-bl-xl">
                    Most Popular
                  </div>
                )}

                <div className={`inline-block rounded-full px-3 py-1 text-xs font-semibold text-white mb-4 ${pkg.badgeColor}`}>
                  {pkg.subtitle}
                </div>

                <h2 className="font-display text-2xl font-bold text-neutral-900 mb-1">{pkg.name}</h2>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-display text-3xl font-bold text-brand-700">{pkg.price}</span>
                </div>
                <p className="text-xs text-brand-600 font-medium mb-4">{pkg.savings}</p>

                <p className="text-neutral-600 text-sm leading-relaxed mb-6">{pkg.description}</p>

                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">What&apos;s Included</p>
                  <ul className="space-y-2.5">
                    {pkg.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-700">
                        <CheckCircle2 className="h-4 w-4 text-brand-600 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-neutral-50 rounded-xl px-4 py-3 mb-6">
                  <p className="text-xs text-neutral-500">
                    <span className="font-semibold text-neutral-700">Best for: </span>
                    {pkg.bestFor}
                  </p>
                </div>

                <Button asChild size="lg" className="w-full" variant={pkg.featured ? "default" : "outline"}>
                  <Link href={pkg.href}>Get Started <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Build Your Own */}
      <section className="py-16 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-neutral-900 mb-2">Prefer à la Carte?</h2>
            <p className="text-neutral-600 text-sm mb-8">
              All services are also available individually. Mix and match based on what you need.
            </p>
            <div className="space-y-3">
              {buildYourOwn.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between bg-white rounded-xl border border-neutral-200 px-5 py-4 hover:border-brand-200 hover:bg-brand-50 transition-all group"
                >
                  <span className="text-sm font-medium text-neutral-700 group-hover:text-brand-700">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-brand-700">{item.price}</span>
                    <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Link href="/investment" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800">
                View full pricing <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SectionCTA
        heading="Not Sure Which Package Is Right?"
        body="Book a call and let's figure it out together. There's no obligation, just an honest conversation about what makes sense for your situation."
        primaryLabel="Book a Call"
        secondaryLabel="View All Services"
        secondaryHref="/services"
      />
    </>
  );
}
