import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionCTAProps {
  heading?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  variant?: "light" | "dark";
}

export function SectionCTA({
  heading = "Ready to Get Started?",
  body = "Let's talk about what growth looks like for you. No pressure. Just an honest conversation.",
  primaryLabel = "Book a Call",
  primaryHref = "/book",
  secondaryLabel = "Learn More",
  secondaryHref = "/services",
  variant = "dark",
}: SectionCTAProps) {
  if (variant === "light") {
    return (
      <section className="py-16 lg:py-20 bg-brand-50 border-t border-brand-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">
            {heading}
          </h2>
          <p className="text-neutral-600 leading-relaxed mb-8">{body}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href={primaryHref}>
                <Calendar className="h-4 w-4" />
                {primaryLabel}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={secondaryHref}>
                {secondaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-20 bg-brand-700">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
          {heading}
        </h2>
        <p className="text-brand-200 leading-relaxed mb-8">{body}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-brand-700 hover:bg-brand-50"
          >
            <Link href={primaryHref}>
              <Calendar className="h-4 w-4" />
              {primaryLabel}
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-brand-400 text-brand-100 hover:bg-brand-600 hover:text-white"
          >
            <Link href={secondaryHref}>
              {secondaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
