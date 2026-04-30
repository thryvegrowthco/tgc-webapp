import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, FileText, Briefcase, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCTA } from "@/components/shared/SectionCTA";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Ready to use templates and resources from Thryve Growth Co. Practical tools for career growth, leadership, and HR.",
};

const categories = [
  {
    name: "Career & Job Search",
    icon: Briefcase,
    description: "Resumes, cover letters, and interview prep tools you can put to work right away.",
  },
  {
    name: "Leadership & Coaching",
    icon: Sparkles,
    description: "Frameworks and worksheets for growing as a leader and getting clear on what's next.",
  },
  {
    name: "HR & Team Operations",
    icon: Users,
    description: "Policies, playbooks, and templates that help small teams build real structure.",
  },
];

const resources = [
  {
    category: "Career & Job Search",
    title: "Resume Template Pack",
    description: "Three clean, modern resume templates designed for clarity and easy customization.",
    price: "$19",
    type: "Buy Now",
  },
  {
    category: "Career & Job Search",
    title: "Cover Letter Starter Kit",
    description: "A simple framework plus three editable examples for different career moments.",
    price: "$15",
    type: "Buy Now",
  },
  {
    category: "Career & Job Search",
    title: "Interview Prep Workbook",
    description: "STAR method guidance, common questions, and space to draft your strongest answers.",
    price: "Free",
    type: "Download",
  },
  {
    category: "Leadership & Coaching",
    title: "Career Vision Worksheet",
    description: "A reflection guide to help you get clear on what you want and what's getting in the way.",
    price: "Free",
    type: "Download",
  },
  {
    category: "Leadership & Coaching",
    title: "First 90 Days Leadership Plan",
    description: "A structured template for new leaders stepping into a role with intention.",
    price: "$25",
    type: "Buy Now",
  },
  {
    category: "HR & Team Operations",
    title: "Onboarding Checklist Template",
    description: "A simple, repeatable onboarding flow that helps new hires feel set up for success.",
    price: "$19",
    type: "Buy Now",
  },
  {
    category: "HR & Team Operations",
    title: "Performance Review Toolkit",
    description: "Review templates, prep prompts, and conversation guides for honest, useful reviews.",
    price: "$29",
    type: "Buy Now",
  },
  {
    category: "HR & Team Operations",
    title: "Team Values Worksheet",
    description: "A guided exercise for naming the values your team actually wants to live by.",
    price: "Free",
    type: "Download",
  },
];

export default function ResourcesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">Resources</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              Ready to Use <span className="text-brand-700">Templates and Tools.</span>
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              This is the home for practical templates and resources you can put
              to work right away. Whether you&apos;re refreshing your resume,
              stepping into a new leadership role, or building structure for your
              team, you&apos;ll find something here to help you move forward.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">
              Browse by Category
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Each resource is built from real client work, so you can trust that
              what you download is something we actually use.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  className="rounded-2xl border border-neutral-200 bg-white p-6 hover:border-brand-200 hover:bg-brand-50 transition-colors"
                >
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-brand-100 text-brand-700 mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-neutral-900 mb-2">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Resource Grid */}
      <section className="py-16 lg:py-20 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">
              Templates and Tools
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Pick what you need, download instantly, and start putting it to use today.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((res) => (
              <div
                key={res.title}
                className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-brand-600" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                    {res.category}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-neutral-900 mb-2">
                  {res.title}
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-6 flex-1">
                  {res.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl font-bold text-brand-700">
                    {res.price}
                  </span>
                  <Button size="sm" variant={res.type === "Download" ? "outline" : "default"}>
                    {res.type === "Download" ? (
                      <>
                        <Download className="h-4 w-4" />
                        Download
                      </>
                    ) : (
                      <>
                        Buy Now
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Resources */}
      <section className="py-16 lg:py-20 bg-white border-t border-neutral-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">
            Built from Real Client Work
          </h2>
          <p className="text-neutral-600 leading-relaxed mb-8">
            Every template here started as something we built for a client.
            They&apos;re practical, tested, and designed to save you time so you
            can focus on the work that matters most.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Have a request? Let us know <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <SectionCTA
        heading="Need Something More Tailored?"
        body="If you want help putting these tools to use, or you need something built for your specific situation, book a call and let's talk."
        primaryLabel="Book a Call"
        secondaryLabel="View All Services"
        secondaryHref="/services"
      />
    </>
  );
}
