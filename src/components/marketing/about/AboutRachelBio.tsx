import { RachelPhoto } from "@/components/shared/RachelPhoto";

const highlights = [
  "10+ years of hands-on HR leadership experience",
  "Built and led HR departments from the ground up",
  "Coached individuals through career transitions and promotions",
  "Developed onboarding, performance, and retention programs",
  "Partnered with executives on culture and organizational design",
  "SHRM-certified HR professional",
];

export function AboutRachelBio() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section intro */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-4">
            <span className="text-sm font-semibold text-brand-800 tracking-wide">
              Meet Rachel
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
            The Person Behind the Work
          </h2>
          <p className="text-neutral-600 leading-relaxed">
            I didn&apos;t land here by accident. I built my career from the ground
            up, starting in assistant level roles and working my way into senior
            leadership. Every step came with a learning curve, tough moments, and
            a lot of figuring things out in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">

          {/* Bio copy — wider column */}
          <div className="lg:col-span-3 space-y-5 text-neutral-600 leading-relaxed">
            <p>
              That experience shaped how I approach this work.
            </p>
            <p>
              I&apos;m not here to give surface level advice or tell you what
              sounds good. I&apos;m here to help you get clear, be honest about
              what&apos;s actually going on, and take action that moves you forward.
            </p>
            <p>
              Through Thryve Growth Co., I work with individuals and organizations
              who are ready to take their growth seriously and do the work it
              requires.
            </p>

            {/* Highlights */}
            <div className="pt-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-4">
                Background Highlights
              </p>
              <ul className="space-y-2.5">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <span className="h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs mt-0.5">
                      ✓
                    </span>
                    <span className="text-neutral-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Secondary photo — narrower column */}
          <div className="lg:col-span-2">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 -z-10"
              />
              <RachelPhoto
                variant="about-2"
                className="w-full rounded-2xl shadow-md"
              />
            </div>
            <div className="mt-6 bg-brand-50 rounded-xl p-5 border border-brand-100">
              <p className="text-sm font-semibold text-brand-800 mb-1">
                Rachel&apos;s philosophy:
              </p>
              <p className="text-sm text-brand-700 leading-relaxed italic">
                &ldquo;I&apos;ll support you, and I&apos;ll be honest with you. You
                need both.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
