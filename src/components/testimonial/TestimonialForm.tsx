"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { submitTestimonial } from "@/app/actions/testimonials";

const TEXTAREA_CLASS =
  "flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2";

interface Props {
  token: string;
  prefillName: string;
}

export function TestimonialForm({ token, prefillName }: Props) {
  const router = useRouter();
  const [quote, setQuote] = React.useState("");
  const [authorName, setAuthorName] = React.useState(prefillName);
  const [authorTitle, setAuthorTitle] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quote.trim().length < 10) return toast.error("Please share a little more — at least a sentence.");
    if (authorName.trim().length < 2) return toast.error("Please enter your name.");

    setSubmitting(true);
    const res = await submitTestimonial({
      token,
      quote: quote.trim(),
      authorName: authorName.trim(),
      authorTitle: authorTitle.trim() || null,
      rating: rating > 0 ? rating : null,
    });
    if (res.error) {
      setSubmitting(false);
      toast.error(res.error);
      return;
    }
    router.push(`/testimonial/${token}/thanks`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Rating */}
      <div className="space-y-1.5">
        <Label>Your rating (optional)</Label>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
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
                aria-pressed={rating === n}
                className="p-0.5 rounded transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-colors",
                    filled ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Quote */}
      <div className="space-y-1.5">
        <Label htmlFor="t-quote">Your testimonial <span className="text-red-500">*</span></Label>
        <textarea
          id="t-quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={5}
          maxLength={2000}
          required
          className={TEXTAREA_CLASS}
          placeholder="What was helpful? What changed for you?"
        />
      </div>

      {/* Name + title */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="t-name">Your name <span className="text-red-500">*</span></Label>
          <Input
            id="t-name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="First Last"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-title">Title / role (optional)</Label>
          <Input
            id="t-title"
            value={authorTitle}
            onChange={(e) => setAuthorTitle(e.target.value)}
            placeholder="e.g. Director of Operations"
          />
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Sending…" : "Share my testimonial"}
      </Button>
      <p className="text-xs text-neutral-400 text-center">
        Rachel reviews each testimonial before it appears on the site.
      </p>
    </form>
  );
}
