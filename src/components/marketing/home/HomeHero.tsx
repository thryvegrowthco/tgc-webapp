import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RachelPhoto } from "@/components/shared/RachelPhoto";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50">
      {/* Decorative background blobs */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-100 opacity-40 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-brand-200 opacity-30 blur-3xl pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Copy — left column */}
          <div className="order-2 lg:order-1">
            {/* Tagline pill */}
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
              <span className="text-sm font-semibold text-brand-800 tracking-wide">
                Clarity. Accountability. Real Growth.
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 leading-[1.1] tracking-tight">
              Grow Better{" "}
              <span className="text-brand-700">Leaders.</span>
              <br />
              Build Stronger{" "}
              <span className="text-brand-700">Teams.</span>
              <br />
              Move Careers{" "}
              <span className="text-brand-700">Forward.</span>
            </h1>

            <p className="mt-6 text-lg text-neutral-600 leading-relaxed max-w-xl">
              Growth takes clarity, accountability, and someone who will tell you
              what you need to hear — not just what sounds nice.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/book">
                  Start Your Growth
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/services">Explore Our Services</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex items-center gap-6 text-sm text-neutral-500">
              <div className="flex items-center gap-1.5">
                <span className="text-brand-600 font-bold">10+</span>
                <span>Years HR Leadership</span>
              </div>
              <div className="w-px h-4 bg-neutral-200" />
              <div className="flex items-center gap-1.5">
                <span className="text-brand-600 font-bold">100%</span>
                <span>Real-world Experience</span>
              </div>
            </div>
          </div>

          {/* Rachel's photo — right column */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm lg:max-w-md">
              {/* Photo with decorative border */}
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-brand-200 to-brand-100 -z-10"
                />
                <RachelPhoto
                  variant="hero"
                  priority
                  className="w-full aspect-[4/5] shadow-xl"
                />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-4 -left-6 bg-white rounded-xl shadow-lg p-4 border border-neutral-100">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                  My Approach
                </p>
                <p className="text-sm font-bold text-neutral-900">
                  Direct. Honest. Practical.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
