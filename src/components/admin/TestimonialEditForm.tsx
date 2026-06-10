"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createTestimonial, updateTestimonial } from "@/app/actions/testimonials";
import type { Testimonial } from "@/types/database";

const TEXTAREA_CLASS =
  "flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2";

export function TestimonialEditForm({ testimonial }: { testimonial?: Testimonial }) {
  const router = useRouter();
  const isEdit = !!testimonial;
  const [quote, setQuote] = React.useState(testimonial?.quote ?? "");
  const [authorName, setAuthorName] = React.useState(testimonial?.author_name ?? "");
  const [authorTitle, setAuthorTitle] = React.useState(testimonial?.author_title ?? "");
  const [serviceType, setServiceType] = React.useState(testimonial?.service_type ?? "");
  const [rating, setRating] = React.useState(testimonial?.rating ?? 0);
  const [hover, setHover] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quote.trim().length < 10) return toast.error("Add a longer quote (at least a sentence).");
    if (authorName.trim().length < 2) return toast.error("Add the author's name.");

    const fields = {
      quote: quote.trim(),
      authorName: authorName.trim(),
      authorTitle: authorTitle.trim() || null,
      serviceType: serviceType.trim() || null,
      rating: rating > 0 ? rating : null,
    };

    setSaving(true);
    if (isEdit) {
      const res = await updateTestimonial(testimonial!.id, fields);
      setSaving(false);
      if (res.error) return toast.error(res.error);
      toast.success("Testimonial saved.");
    } else {
      const res = await createTestimonial({ ...fields, status: "approved" });
      setSaving(false);
      if (res.error) return toast.error(res.error);
      toast.success("Testimonial added and approved.");
    }
    router.push("/admin/testimonials");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Rating */}
      <div className="space-y-1.5">
        <Label>Rating (optional)</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n === rating ? 0 : n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className="p-0.5 rounded transition-transform hover:scale-110"
              >
                <Star className={cn("h-6 w-6 transition-colors", filled ? "fill-amber-400 text-amber-400" : "text-neutral-300")} />
              </button>
            );
          })}
          {rating > 0 && (
            <button type="button" onClick={() => setRating(0)} className="ml-2 text-xs text-neutral-400 hover:underline">
              clear
            </button>
          )}
        </div>
      </div>

      {/* Quote */}
      <div className="space-y-1.5">
        <Label htmlFor="te-quote">Quote <span className="text-red-500">*</span></Label>
        <textarea
          id="te-quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={5}
          maxLength={2000}
          required
          className={TEXTAREA_CLASS}
        />
      </div>

      {/* Author + title + service */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="te-name">Author name <span className="text-red-500">*</span></Label>
          <Input id="te-name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="te-title">Title / role</Label>
          <Input id="te-title" value={authorTitle} onChange={(e) => setAuthorTitle(e.target.value)} placeholder="e.g. Director of Operations" />
        </div>
      </div>

      <div className="space-y-1.5 max-w-sm">
        <Label htmlFor="te-service">Service</Label>
        <Input id="te-service" value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="e.g. Career & Leadership Coaching" />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add testimonial"}
        </Button>
        {!isEdit && <span className="text-xs text-neutral-400">Manually-added testimonials are approved and live right away.</span>}
      </div>
    </form>
  );
}
