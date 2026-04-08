import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeFinalCTA() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-br from-brand-50 via-white to-brand-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-brand-100 opacity-50 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-brand-200 opacity-40 blur-3xl pointer-events-none"
      />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-6">
          <span className="text-sm font-semibold text-brand-800 tracking-wide">
            Ready When You Are
          </span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 leading-tight mb-6">
          Ready to Grow?
        </h2>

        <p className="text-lg text-neutral-600 leading-relaxed mb-10 max-w-xl mx-auto">
          Whether you&apos;re looking to build a stronger team, advance your career,
          or just figure out your next move — let&apos;s talk. No pressure, no
          commitment, just an honest conversation about what growth looks like
          for you.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="xl">
            <Link href="/book">
              <Calendar className="h-5 w-5" />
              Book a Call
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="/services">
              View Services
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-neutral-400">
          Not sure where to start?{" "}
          <Link href="/contact" className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-4">
            Send me a message
          </Link>{" "}
          and we&apos;ll figure it out together.
        </p>
      </div>
    </section>
  );
}
