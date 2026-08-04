import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Download, ArrowRight, Compass, Sparkles, Star } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { SectionCTA } from "@/components/shared/SectionCTA";
import { RachelPhoto } from "@/components/shared/RachelPhoto";
import { NewsletterForm } from "@/components/shared/NewsletterForm";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Testimonial } from "@/types/database";

const SLUG = "career-reset-workbook";
const DOWNLOAD_URL = `/api/resources/download/${SLUG}`;

export const metadata: Metadata = {
  title: "Career Reset Workbook",
  description:
    "A free, guided workbook to help you get unstuck, get clear on what you actually want next, and map your first real steps — at your own pace. From Thryve Growth Co.",
  openGraph: {
    title: "The Career Reset Workbook — Free",
    description:
      "Feeling stuck? This free workbook walks you through the exact questions a career coach starts with — so you leave with clarity and a first plan.",
  },
};

// ── The workbook's eight parts (matches the actual PDF) ───────────────────────
const INSIDE = [
  "Pause + Reflect — take an honest “career temperature” and name what's draining you versus what's working",
  "Rediscover your strengths — build an evidence bank of real wins and name your five strongest strengths",
  "Create your career vision — picture an ordinary good day two years out and turn it into a clear direction",
  "Define your non-negotiables — choose the five things that matter most, with your real deal-breakers",
  "Set goals that create movement — a 90-day goal broken into realistic 30 / 60 / 90-day milestones",
  "Check your job-search readiness — a scorecard across your résumé, story, network, interviewing, and more",
  "Build your 30-day plan — four focused weeks: clarify, position, connect, and act",
  "Celebrate the progress — see how far you've come and commit to your next 30 days",
];

const WHO_FOR = [
  { icon: Compass, title: "In an in-between season", body: "You know something about work needs to change — but you're not sure yet what the change should be." },
  { icon: Sparkles, title: "Stuck, restless, or drained", body: "You want space to get honest about where you are and what actually matters to you now." },
  { icon: Star, title: "Ready for a real next step", body: "Whether that's reshaping your current role or starting a search, you want a clear, doable plan." },
];

export default async function CareerResetWorkbookPage() {
  const supabase = await createClient();

  // Anon RLS returns the row only when enabled; confirm it's actually downloadable.
  const { data: resource } = await supabase
    .from("resources")
    .select("title, description, price, cta_type, file_path, external_url")
    .eq("slug", SLUG)
    .maybeSingle();
  const r = resource as
    | { file_path: string | null; external_url: string | null }
    | null;
  const downloadable = !!r && (!!r.file_path || !!r.external_url);

  // Social proof — only render if there are approved testimonials (never empty).
  const { data: tRows } = await supabase
    .from("testimonials")
    .select("id, quote, author_name, author_title, rating, status")
    .order("approved_at", { ascending: false })
    .limit(3);
  const testimonials = ((tRows ?? []) as Testimonial[]).filter((t) => t.status === "approved").slice(0, 3);

  // Render helper (not a component — avoids the "components during render" rule).
  const downloadCta = (size: "lg" | "xl", label: string) =>
    downloadable ? (
      <Button asChild size={size}>
        <a href={DOWNLOAD_URL}>
          <Download className="h-4 w-4" /> {label}
        </a>
      </Button>
    ) : (
      <Button asChild size={size}>
        <Link href="/resources">
          Browse resources <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    );

  return (
    <>
      {/* Hero */}
      <PageHero
        eyebrow="Free Workbook"
        title="The Career Reset"
        titleAccent="Workbook"
        description="A free, guided workbook for that in-between season — when you know something about work needs to change, but you're not sure what. Eight short parts help you get honest about where you are, reconnect with your strengths, and map one realistic step forward."
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {downloadCta("lg", "Download the workbook")}
          <span className="text-sm text-neutral-500">Free · instant download · no strings attached</span>
        </div>
      </PageHero>

      {/* What's inside */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">What&apos;s inside</h2>
            <p className="text-neutral-600 leading-relaxed">
              Eight short, guided parts — the same reflection Rachel walks clients through — that you can work through
              at your own pace. No perfect answers required; just honest ones.
            </p>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {INSIDE.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <span className="text-neutral-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 lg:py-20 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">Who it&apos;s for</h2>
            <p className="text-neutral-600 leading-relaxed">If any of these sound like you, this is a good place to start.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHO_FOR.map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-brand-100 text-brand-700 mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-neutral-900 mb-1.5">{w.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{w.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Meet Rachel */}
      <section className="py-16 lg:py-20 bg-white border-t border-neutral-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 items-center">
            <RachelPhoto variant="profile" rounded className="w-40 h-40 mx-auto md:mx-0 ring-4 ring-brand-100" />
            <div>
              <h2 className="font-display text-2xl font-bold text-neutral-900 mb-3">Meet Rachel</h2>
              <p className="text-neutral-600 leading-relaxed">
                Rachel is an HR consultant and career coach who has spent years helping people get unstuck and move
                toward work that actually fits. This workbook distills the first questions she walks every client
                through — so you can get a running start on your own, for free.
              </p>
            </div>
          </div>

          {testimonials.length > 0 && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
                  <blockquote className="text-sm text-neutral-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-3 text-xs font-medium text-neutral-500">
                    {t.author_name}
                    {t.author_title ? `, ${t.author_title}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Get the workbook + soft email ask */}
      <section className="py-16 lg:py-24 bg-brand-50 border-t border-brand-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">Get the workbook</h2>
          <p className="text-neutral-600 leading-relaxed mb-8">
            Download it now — it&apos;s free and yours to keep. No email required.
          </p>
          <div className="flex justify-center">
            {downloadCta("xl", "Download the free workbook")}
          </div>

          <div className="mt-12 pt-8 border-t border-brand-100">
            <p className="text-sm text-neutral-600 mb-4">
              Want more like this? Join the newsletter for practical career &amp; leadership tips — no spam, unsubscribe anytime.
            </p>
            <div className="max-w-md mx-auto">
              <NewsletterForm variant="inline" source="career-reset-workbook" />
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <SectionCTA
        heading="Want a hand working through it?"
        body="If you'd rather talk it through, book a free 30-minute consultation and we'll figure out your next move together."
        primaryLabel="Book a free consultation"
        primaryHref="/consultation"
        secondaryLabel="View all services"
        secondaryHref="/services"
      />
    </>
  );
}
