import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Testimonial } from "@/types/database";

export const metadata: Metadata = {
  title: "Client Testimonials",
  description: "What clients say about working with Thryve Growth Co.",
  // Kept noindex until enough approved testimonials have accumulated; flip to
  // index:true once the page is populated.
  robots: {
    index: false,
    follow: true,
  },
};

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

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={n <= rating ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-neutral-200"}
        />
      ))}
    </div>
  );
}

export default async function TestimonialsPage() {
  const supabase = await createClient();
  // RLS exposes only approved rows to the public; the JS filter is defensive so
  // an admin browsing this page doesn't see pending/hidden ones (the admin RLS
  // policy would otherwise return all statuses). No `.eq("status")` — it narrows
  // the typed result to never.
  const { data: rows } = await supabase
    .from("testimonials")
    .select("id, quote, author_name, author_title, service_type, rating, status")
    .order("approved_at", { ascending: false })
    .order("submitted_at", { ascending: false })
    .limit(60);
  const testimonials = ((rows ?? []) as Testimonial[]).filter((t) => t.status === "approved");

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
          {testimonials.length === 0 ? (
            <div className="mx-auto max-w-xl text-center">
              <QuoteIcon />
              <h2 className="font-display text-2xl font-bold text-neutral-900 mt-4">
                Stories are on the way
              </h2>
              <p className="text-neutral-600 leading-relaxed mt-2">
                We&apos;re gathering testimonials from recent clients. In the meantime, the best way to
                see how Rachel works is a conversation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-5 rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <QuoteIcon />
                    <Stars rating={t.rating} />
                  </div>
                  <blockquote className="flex-1 text-neutral-700 leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">{t.author_name}</p>
                      {t.author_title && <p className="text-sm text-neutral-500">{t.author_title}</p>}
                    </div>
                    {t.service_type && (
                      <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
                        {t.service_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <Button asChild size="lg">
              <Link href="/consultation">
                Work with Rachel <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
