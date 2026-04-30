const steps = [
  {
    number: "01",
    title: "Get Clear",
    description:
      "We start with a brief intake form so I can come prepared for our discovery call. Then we have a real conversation about where you are, where you want to be, and what's actually getting in the way. Clarity is the foundation of everything.",
  },
  {
    number: "02",
    title: "Build a Plan",
    description:
      "Together we map out a path that makes sense for your situation. Not a generic playbook, but a practical, focused strategy built around your goals, your timeline, and what you're actually capable of executing.",
  },
  {
    number: "03",
    title: "Do the Work",
    description:
      "This is where it gets real. We work, we adjust, and I hold you accountable. Growth isn't comfortable, but it is possible when you have the right support and someone who won't let you off the hook.",
  },
];

const stats = [
  { value: "10+", label: "Years in HR Leadership" },
  { value: "100%", label: "Practitioner-based Approach" },
  { value: "Both", label: "Individual & Org Experience" },
];

export function HomeHowWeWork() {
  return (
    <>
      {/* How We Work Together */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-4">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">
                The Process
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              How We Work Together
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              No mystery. Just a clear, honest path forward. Here&apos;s exactly
              what working with Thryve Growth Co. looks like.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line — desktop only */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-brand-200"
            />

            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                {/* Number circle */}
                <div className="relative z-10 mx-auto w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center mb-6 shadow-md">
                  <span className="font-display text-2xl font-bold text-white">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-neutral-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-neutral-600 leading-relaxed text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility Banner */}
      <section className="py-16 bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-500 mb-2">
              Built From Real Experience
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-500">
              Not Theory. Not Trends. Real-world HR Leadership.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-4xl font-bold text-brand-500 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-brand-500 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
