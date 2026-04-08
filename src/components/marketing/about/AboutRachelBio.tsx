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
            I didn&apos;t start in coaching. I started in the trenches of HR — managing
            difficult conversations, building teams, and figuring out what actually
            moves people forward vs. what just looks good on paper.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">

          {/* Bio copy — wider column */}
          <div className="lg:col-span-3 space-y-5 text-neutral-600 leading-relaxed">
            <p>
              Over more than a decade in HR leadership, I&apos;ve hired hundreds of
              people, coached managers through their hardest conversations, helped
              individuals land roles they didn&apos;t think were possible for them, and
              built the kind of structures that let organizations actually grow —
              not just expand headcount.
            </p>
            <p>
              I&apos;ve seen what works and what doesn&apos;t. I&apos;ve watched companies invest
              in the wrong things and leaders repeat the same patterns. And I&apos;ve
              helped people find real clarity when they couldn&apos;t see a way forward.
            </p>
            <p>
              What I know for certain is this: generic advice doesn&apos;t produce
              real results. Cookie-cutter coaching doesn&apos;t create lasting change.
              The only way to grow is to look honestly at where you are, get
              clear on where you want to go, and then do the actual work to get
              there — with accountability and support from someone who&apos;s been
              in the room.
            </p>
            <p>
              That&apos;s what Thryve Growth Co. is. It&apos;s the support I wish more
              leaders and job seekers had access to — practical, direct, and
              grounded in what actually works.
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
                &ldquo;Growth isn&apos;t comfortable. But it is possible — if you&apos;re willing
                to be honest about where you are and committed to doing the work
                to get where you want to go.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
