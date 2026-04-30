import { Target, Eye, Heart } from "lucide-react";

const values = [
  {
    title: "Honesty Over Comfort",
    description:
      "The most valuable thing I can give you is the truth, even when it's hard to hear. Real growth starts with an honest look at where you actually are.",
  },
  {
    title: "Accountability That Sticks",
    description:
      "Good intentions don't produce results. Consistent action does. I build accountability into every engagement so that momentum doesn't stall between sessions.",
  },
  {
    title: "Practical Over Theoretical",
    description:
      "Every recommendation I make is something I've seen work in the real world. No frameworks that sound good but fall apart in practice.",
  },
  {
    title: "Tailored, Not Template",
    description:
      "Your situation is specific. Your strategy should be too. I don't pull out a playbook. I build one with you based on your actual context.",
  },
  {
    title: "Respect for Your Time",
    description:
      "Every conversation, every deliverable, every recommendation is designed to move you forward. Nothing filler. Nothing just to fill the hour.",
  },
  {
    title: "Belief in Your Potential",
    description:
      "I only take on clients I believe in. If I'm working with you, it's because I genuinely believe you can get where you want to go, and I'll help you prove it.",
  },
];

export function AboutMissionValues() {
  return (
    <section className="py-20 lg:py-28 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Mission + Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-brand-700 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-600 rounded-lg">
                <Target className="h-5 w-5 text-brand-200" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
                Our Mission
              </p>
            </div>
            <p className="font-display text-xl font-bold text-white leading-snug">
              To help individuals and organizations grow with clarity, accountability,
              and the kind of honest guidance that actually moves the needle.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-100 rounded-lg">
                <Eye className="h-5 w-5 text-brand-700" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
                Our Vision
              </p>
            </div>
            <p className="font-display text-xl font-bold text-neutral-900 leading-snug">
              A world where leaders lead well, teams operate with trust, and
              individuals build careers that actually reflect who they are and
              what they&apos;re capable of.
            </p>
          </div>
        </div>

        {/* Values grid */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-4">
            <Heart className="h-3.5 w-3.5 text-brand-700" />
            <span className="text-sm font-semibold text-brand-800 tracking-wide">
              What We Stand For
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">
            Our Values
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((value, i) => (
            <div
              key={value.title}
              className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-brand-600 font-display font-bold text-2xl leading-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-base font-bold text-neutral-900">
                  {value.title}
                </h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
