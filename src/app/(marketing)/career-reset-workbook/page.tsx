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

// ── Draft, editable copy (Rachel: swap for the workbook's real sections) ──────
const INSIDE = [
  "A clear-eyed audit of where your career is right now — what's working and what's quietly draining you",
  "Prompts to reconnect with what you actually want, not just what looks good on paper",
  "A simple way to surface the strengths and experience you can carry into anything next",
  "Space to define your next move — the role, the environment, and your non-negotiables",
  "A first-30-days action plan so you leave with momentum instead of a pile of ideas",
  "Reflection questions you can come back to any time you feel stuck again",
];

const WHO_FOR = [
  { icon: Compass, title: "Feeling stuck or restless", body: "You're not miserable, but something's off — and you're ready to figure out what." },
  { icon: Sparkles, title: "Pivoting or returning", body: "You're changing direction or coming back to work and want a clear starting point." },
  { icon: Star, title: "Craving clarity first", body: "You want to get clear on what you want before you touch the résumé or start applying." },
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
        description="A guided, no-fluff workbook to help you get unstuck, get clear on what you actually want next, and map the first real steps to get there — at your own pace."
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
              It&apos;s the same set of questions Rachel walks clients through at the start of a career reset — pulled
              together so you can work through them on your own.
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
