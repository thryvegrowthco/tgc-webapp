import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Briefcase, Users, Sparkles, Download } from "lucide-react";
import { SectionCTA } from "@/components/shared/SectionCTA";
import { ResourceViewTracker } from "@/components/marketing/ResourceViewTracker";
import { createClient } from "@/lib/supabase/server";
import type { Resource } from "@/types/database";

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

// Resources that have a dedicated landing page — the card links there (the
// landing page carries the full pitch + the download) instead of downloading
// straight from the card.
const LANDING_PAGES: Record<string, string> = {
  "career-reset-workbook": "/career-reset-workbook",
};

export default async function ResourcesPage() {
  // RLS on `resources` restricts anonymous reads to enabled rows automatically;
  // the .eq("enabled", true) here is defensive + lets us share a typed array
  // with the rendering branch below.
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("resources")
    .select("id, slug, category, title, description, price, cta_type, enabled, sort_order, file_path, external_url, file_name, file_size_bytes, view_count, download_count, updated_at, updated_by, created_at")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  const resources = (rows ?? []) as Resource[];

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

      {/* Resource Grid OR Coming-soon empty state */}
      <section className="py-16 lg:py-20 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">
              Templates and Tools
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              {resources.length > 0
                ? "Pick what you need. New templates are being added as we build them out."
                : "We’re putting the finishing touches on the first batch — check back soon."}
            </p>
          </div>

          {resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((res) => (
                <div
                  key={res.id}
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
                    {LANDING_PAGES[res.slug] ? (
                      <Link
                        href={LANDING_PAGES[res.slug]}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-brand-700 transition-colors"
                      >
                        View guide <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : res.cta_type === "Download" && (res.file_path || res.external_url) ? (
                      <a
                        href={`/api/resources/download/${res.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-brand-700 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    ) : (
                      <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-full">
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ComingSoonPanel />
          )}
          {resources.length > 0 && <ResourceViewTracker ids={resources.map((r) => r.id)} />}
        </div>
      </section>

      {/* Why Resources */}
      <section className="py-16 lg:py-20 bg-white border-t border-neutral-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">
            Practical Resources for Real Growth
          </h2>
          <p className="text-neutral-600 leading-relaxed mb-8">
            Every template and resource was created with real people, real
            challenges, and real growth in mind. Designed to help you save time,
            gain clarity, and focus on what matters most.
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
        secondaryLabel="View All Services"
        secondaryHref="/services"
      />
    </>
  );
}

function ComingSoonPanel() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-12 text-center shadow-sm">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-brand-100 text-brand-700 mb-5">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl sm:text-2xl font-semibold text-neutral-900 mb-3">
          More resources coming soon
        </h3>
        <p className="text-neutral-600 leading-relaxed mb-6">
          We&apos;re building practical templates and tools, the same ones we use
          with clients every day. They&apos;ll show up here as they&apos;re ready.
          In the meantime, if you have a specific challenge you&apos;d like help
          with, let&apos;s talk.
        </p>
        <Link
          href="/consultation"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          Book a free 30-minute consultation <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
