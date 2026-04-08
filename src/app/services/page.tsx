import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, User, Users, FileText, Briefcase, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCTA } from "@/components/shared/SectionCTA";

export const metadata: Metadata = {
  title: "Services",
  description:
    "HR consulting, career coaching, culture consulting, interview prep, resume writing, and job alerts — real-world support for individuals and organizations ready to grow.",
};

const coreServices = [
  {
    icon: Building2,
    badge: "For Businesses",
    badgeColor: "bg-blue-100 text-blue-800",
    title: "HR Consulting & Team Development",
    description:
      "Strategic HR support that goes beyond policy. I help organizations build clear structure, develop their leaders, and create the kind of HR foundation that actually lets teams perform.",
    outcomes: ["Role clarity & accountability systems", "Performance management frameworks", "Hiring strategy & process design", "Manager coaching & development"],
    href: "/services/hr-consulting",
  },
  {
    icon: User,
    badge: "For Individuals",
    badgeColor: "bg-brand-100 text-brand-800",
    title: "Career & Leadership Coaching",
    description:
      "Whether you're making a career transition, stepping into a leadership role, or feeling stuck — I'll help you get clear, build confidence, and move forward with intention.",
    outcomes: ["Career clarity & direction", "Leadership skill development", "Confidence & accountability", "Real, actionable strategy"],
    href: "/services/coaching",
  },
  {
    icon: Users,
    badge: "For Businesses",
    badgeColor: "bg-blue-100 text-blue-800",
    title: "Culture & Engagement Consulting",
    description:
      "Culture isn't built with perks and ping pong tables. It's built through clarity, consistency, and leadership. I help organizations define, assess, and build cultures that actually stick.",
    outcomes: ["Culture assessment & gap analysis", "Engagement strategy", "Values & behavioral alignment", "Manager accountability"],
    href: "/services/culture-engagement",
  },
];

const addOnServices = [
  {
    icon: Briefcase,
    badge: "For Individuals",
    title: "Interview Preparation",
    description:
      "Targeted coaching to help you walk into your next interview with confidence, clarity, and a strategy. Mock interviews, real feedback, no sugarcoating.",
    href: "/services/interview-prep",
  },
  {
    icon: FileText,
    badge: "For Individuals",
    title: "Resume & Career Materials",
    description:
      "A resume that tells the right story about who you are and what you bring. Review, rewrite, LinkedIn optimization, and cover letters.",
    href: "/services/resume-materials",
  },
  {
    icon: Bell,
    badge: "For Individuals",
    title: "Job Alerts & Watchlists",
    description:
      "Curated job matches delivered to you — sourced both manually by Rachel and from live job board feeds — filtered to your goals and preferences.",
    href: "/services/job-alerts",
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">Services</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              Real Support for <span className="text-brand-700">Real Growth</span>
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
              Whether you&apos;re an organization that needs stronger HR infrastructure, or an individual
              ready to take your career seriously — there&apos;s a path forward. Here&apos;s how I can help.
            </p>
          </div>
        </div>
      </section>

      {/* Core Services */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">
              Core Services
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900">
              Where Most Clients Start
            </h2>
          </div>

          <div className="space-y-6">
            {coreServices.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.href}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-brand-200 transition-all"
                >
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-brand-50 rounded-xl">
                        <Icon className="h-5 w-5 text-brand-600" />
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${svc.badgeColor}`}>
                        {svc.badge}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-neutral-900 mb-3">
                      {svc.title}
                    </h3>
                    <p className="text-neutral-600 leading-relaxed">
                      {svc.description}
                    </p>
                  </div>
                  <div className="flex flex-col justify-between">
                    <ul className="space-y-2 mb-6">
                      {svc.outcomes.map((o) => (
                        <li key={o} className="flex items-start gap-2 text-sm text-neutral-600">
                          <span className="h-4 w-4 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs mt-0.5">✓</span>
                          {o}
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant="outline" size="sm" className="self-start">
                      <Link href={svc.href}>
                        Learn more <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Add-on Services */}
      <section className="py-20 lg:py-24 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">
              Additional Support
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900">
              Targeted Help When You Need It
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {addOnServices.map((svc) => {
              const Icon = svc.icon;
              return (
                <Link
                  key={svc.href}
                  href={svc.href}
                  className="group bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md hover:border-brand-200 transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-brand-50 rounded-xl">
                      <Icon className="h-5 w-5 text-brand-600" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-100 text-brand-800">
                      {svc.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-neutral-900 mb-2 group-hover:text-brand-700 transition-colors">
                    {svc.title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                    {svc.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2 transition-all">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Investment nudge */}
      <section className="py-12 bg-white border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-neutral-900">Wondering about investment?</p>
            <p className="text-sm text-neutral-500">Pricing is transparent and listed publicly.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/investment">View Pricing <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <SectionCTA
        heading="Not Sure Where to Start?"
        body="That's okay. Tell me what's going on and I'll help you figure out what makes sense. No pressure, no commitment."
        primaryLabel="Book a Call"
        secondaryLabel="View Pricing"
        secondaryHref="/investment"
      />
    </>
  );
}
