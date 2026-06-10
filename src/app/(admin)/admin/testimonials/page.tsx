// Admin moderation queue for testimonials. Clients submit via a per-booking link
// (the post-service follow-up email); submissions land here as 'pending' for
// Rachel to approve, hide, or edit. She can also add one manually.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, MessageSquareQuote, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCentralDate } from "@/lib/time/central";
import { TestimonialStatusControl } from "@/components/admin/TestimonialStatusControl";
import type { Testimonial } from "@/types/database";

export const metadata: Metadata = {
  title: "Testimonials — Admin",
  robots: { index: false, follow: false },
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  hidden: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={n <= rating ? "h-3.5 w-3.5 fill-amber-400 text-amber-400" : "h-3.5 w-3.5 text-neutral-300"}
        />
      ))}
    </span>
  );
}

export default async function AdminTestimonialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/testimonials");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  // Admin sees every status — no `.eq("status")` (it narrows the typed result to
  // never). Fetch all, cast, group in JS.
  const { data: rows } = await supabase
    .from("testimonials")
    .select("id, quote, author_name, author_title, service_type, rating, status, submitted_at, booking_id, created_at")
    .order("submitted_at", { ascending: false })
    .limit(200);
  const testimonials = (rows ?? []) as Testimonial[];

  const counts = testimonials.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});
  // Pending first (needs attention), then approved, then hidden.
  const order: Record<string, number> = { pending: 0, approved: 1, hidden: 2 };
  const sorted = [...testimonials].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Testimonials</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Approve client submissions to show them on the public site, or add one yourself.
            {counts.pending ? ` ${counts.pending} waiting for review.` : ""}
          </p>
        </div>
        <Link
          href="/admin/testimonials/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add testimonial
        </Link>
      </div>

      {testimonials.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <MessageSquareQuote className="h-6 w-6 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No testimonials yet.</p>
          <p className="text-xs text-neutral-400 mt-1">
            Clients are invited to leave one in the post-session follow-up email.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((t) => (
            <div key={t.id} className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold border ${STATUS_BADGE[t.status] ?? STATUS_BADGE.pending}`}>
                      {t.status}
                    </span>
                    <Stars rating={t.rating} />
                    {!t.booking_id && (
                      <span className="text-[10px] uppercase tracking-wide text-neutral-400">added manually</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-800 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-xs text-neutral-500 mt-2">
                    <span className="font-medium text-neutral-700">{t.author_name}</span>
                    {t.author_title ? `, ${t.author_title}` : ""}
                    {t.service_type ? ` · ${t.service_type}` : ""}
                    {` · ${formatCentralDate(t.submitted_at, { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                </div>
                <TestimonialStatusControl id={t.id} status={t.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
