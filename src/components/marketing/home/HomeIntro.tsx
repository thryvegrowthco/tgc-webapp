import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RachelPhoto } from "@/components/shared/RachelPhoto";

export function HomeIntro() {
  return (
    <section className="py-20 lg:py-28 bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Photo — left column */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative w-full max-w-xs lg:max-w-sm">
              <RachelPhoto
                variant="about"
                className="w-full aspect-[4/5] shadow-lg"
              />
              {/* Accent card */}
              <div className="absolute -top-4 -right-6 bg-brand-600 rounded-xl shadow-lg p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
                  Based in
                </p>
                <p className="text-sm font-bold">
                  Serving clients<br />nationwide
                </p>
              </div>
            </div>
          </div>

          {/* Copy — right column */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-6">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">
                Meet Rachel
              </span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 leading-tight mb-6">
              Hi, I&apos;m Rachel.
            </h2>

            <div className="space-y-4 text-neutral-600 leading-relaxed">
              <p>
                I&apos;m an HR professional and career coach with over a decade of
                real-world experience leading HR teams, building company cultures,
                and helping people navigate careers that actually mean something
                to them.
              </p>
              <p>
                I started Thryve Growth Co. because I kept seeing the same
                patterns: organizations struggling with unclear expectations and
                disengaged teams, and individuals stuck in careers that didn&apos;t
                fit, unsure of their next move.
              </p>
              <p>
                My approach isn&apos;t about giving you a playbook. It&apos;s about
                getting clear on what&apos;s actually going on, building real
                accountability, and helping you grow in a way that sticks.
              </p>
            </div>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 mt-8 text-brand-700 font-semibold hover:text-brand-800 transition-colors"
            >
              More about me and Thryve Growth Co.
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
