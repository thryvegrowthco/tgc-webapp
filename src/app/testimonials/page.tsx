import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Client Testimonials",
  description: "What clients say about working with Thryve Growth Co.",
  robots: {
    index: false,
    follow: true,
  },
};

const testimonials = [
  {
    quote:
      "I had been in the same role for six years telling myself I was fine — Rachel was the first person who helped me see I had completely outgrown it. She didn't tell me what I wanted to hear. She asked the right questions and held me accountable to actually doing something about it. Three months later I accepted a director-level offer I never would have chased on my own.",
    name: "Marcus T.",
    title: "Director of Operations",
    service: "Career & Leadership Coaching",
  },
  {
    quote:
      "I had bombed three final-round interviews before working with Rachel. In two sessions she helped me understand exactly why — I was answering questions like I was still in my old role instead of the one I was applying for. Her feedback was direct and a little uncomfortable, which is exactly what I needed. I got an offer the next time out.",
    name: "Danielle K.",
    title: "Senior Product Manager, Healthcare Tech",
    service: "Interview Preparation",
  },
  {
    quote:
      "Rachel rewrote my resume and I couldn't believe it was about me. She took ten years of job history I thought was unremarkable and made it read like a career that had direction. Within two weeks of sending it out I had more callbacks than I'd had in the previous six months combined.",
    name: "James R.",
    title: "Operations Manager",
    service: "Resume Rewrite",
  },
  {
    quote:
      "We had grown to 22 employees and were still running HR like a startup — no documented processes, no accountability structure, managers making it up as they went. Rachel came in, assessed where we were, and gave us a framework we could actually use. She didn't overcomplicate it. Six months in, our managers are more confident and our turnover has dropped noticeably.",
    name: "Priya S.",
    title: "COO, Regional Logistics Company",
    service: "HR Consulting",
  },
  {
    quote:
      "We'd done engagement surveys for years and done nothing with them. Rachel helped us understand that was the actual problem — not our scores, but our inability to act on what we were hearing. She ran a culture assessment, gave us honest feedback about where leadership was falling short, and helped us build a real action plan. The difference in team energy over the next quarter was noticeable.",
    name: "Tom B.",
    title: "VP of People, 60-person SaaS Company",
    service: "Culture & Engagement",
  },
];

const QuoteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-6 h-6 text-brand-500"
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
);

export default function TestimonialsPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">Testimonials</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              What Clients Say
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Real feedback from real clients. No embellishment, no cherry-picking.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="flex flex-col gap-5 rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm"
              >
                <QuoteIcon />
                <blockquote className="flex-1 text-neutral-700 leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-semibold text-neutral-900">{t.name}</p>
                    <p className="text-sm text-neutral-500">{t.title}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
                    {t.service}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button asChild size="lg">
              <Link href="/book">
                Work with Rachel <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
