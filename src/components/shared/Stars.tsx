import { Star } from "lucide-react";

/**
 * Five-star rating display. Renders nothing when `rating` is null/0 so callers
 * can drop it in unconditionally. Shared by the testimonials page and the
 * career-reset-workbook social proof.
 */
export function Stars({ rating }: { rating: number | null }) {
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
