import Link from "next/link";
import { ArrowRight, Users, User, Building2, FileText, Briefcase, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Building2,
    badge: "For Businesses",
    badgeColor: "bg-blue-100 text-blue-800",
    title: "HR Consulting & Team Development",
    description:
      "Strategic HR support for growing organizations. I help you build structure, clarify roles, and develop the leadership your team needs to perform at its best.",
    href: "/services/hr-consulting",
  },
  {
    icon: User,
    badge: "For Individuals",
    badgeColor: "bg-brand-100 text-brand-800",
    title: "Career & Leadership Coaching",
    description:
      "Whether you're navigating a career transition, stepping into leadership, or just feeling stuck, I'll help you get clear on where you want to go and how to get there.",
    href: "/services/coaching",
  },
  {
    icon: Users,
    badge: "For Businesses",
    badgeColor: "bg-blue-100 text-blue-800",
    title: "Culture & Engagement Consulting",
    description:
      "Culture isn't a perks program. It's how your team shows up every day. I help organizations build cultures that are clear, sustainable, and actually lived.",
    href: "/services/culture-engagement",
  },
];

const addOns = [
  { icon: FileText, title: "Resume & Career Materials", href: "/services/resume-materials" },
  { icon: Briefcase, title: "Interview Preparation", href: "/services/interview-prep" },
  { icon: Bell, title: "Job Alerts & Watchlists", href: "/services/job-alerts" },
];

export function HomeServicesOverview() {
  return (
    <section className="py-20 lg:py-28 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-4">
            <span className="text-sm font-semibold text-brand-800 tracking-wide">
              Services
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
            How I Can Support You
          </h2>
          <p className="text-neutral-600 leading-relaxed">
            Whether you&apos;re building a team or building a career, there&apos;s a path
            forward, and I&apos;m here to help you find it.
          </p>
        </div>

        {/* Core Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <Link
                key={svc.href}
                href={svc.href}
                className="group bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm hover:shadow-md hover:border-brand-200 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-brand-50 rounded-xl">
                    <Icon className="h-6 w-6 text-brand-600" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${svc.badgeColor}`}>
                    {svc.badge}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-neutral-900 mb-3 group-hover:text-brand-700 transition-colors">
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

        {/* Add-on Services */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
            Additional Support
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {addOns.map((addon) => {
              const Icon = addon.icon;
              return (
                <Link
                  key={addon.href}
                  href={addon.href}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-brand-50 transition-colors group"
                >
                  <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-brand-100 transition-colors">
                    <Icon className="h-4 w-4 text-neutral-600 group-hover:text-brand-700 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-neutral-700 group-hover:text-brand-700 transition-colors">
                    {addon.title}
                  </span>
                  <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-brand-500 ml-auto transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button asChild size="lg">
            <Link href="/services">
              View All Services
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
