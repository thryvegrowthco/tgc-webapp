export function AboutTGC() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">

          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-6">
            <span className="text-sm font-semibold text-brand-800 tracking-wide">
              Our Story
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-8 leading-tight">
            About TGC
          </h2>

          <div className="space-y-6 text-neutral-600 leading-relaxed">
            <p>
              Thryve Growth Co. was created to offer something more real.
            </p>
            <p>
              After years in human resources and leadership, I saw the same
              patterns over and over. Talented people feeling stuck. Leaders
              wanting to do better but not knowing how. Organizations investing
              in solutions that looked good on paper but didn&apos;t actually
              change anything.
            </p>
            <p>
              I built Thryve to do that differently.
            </p>
            <p>
              This work is grounded in a simple belief. Growth happens when
              clarity, accountability, and support exist together.
            </p>
            <p>
              That means honest conversations. Clear direction. Real follow
              through.
            </p>
            <p>
              Whether I&apos;m working with individuals, leaders, or organizations,
              the goal stays the same. Help you understand where you are, what
              needs to shift, and how to move forward with confidence.
            </p>
            <p>
              Growth is not always comfortable, but it is always possible.
            </p>
          </div>

          {/* Pull quote */}
          <div className="mt-10 border-l-4 border-brand-500 pl-6">
            <p className="text-lg font-medium text-neutral-800 leading-relaxed italic">
              &ldquo;Growth happens when clarity, accountability, and support
              exist together.&rdquo;
            </p>
            <p className="mt-3 text-sm font-semibold text-brand-700">
              Rachel, Founder of Thryve Growth Co.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
