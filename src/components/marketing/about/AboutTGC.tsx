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
            Why Thryve Growth Co. Exists
          </h2>

          <div className="space-y-6 text-neutral-600 leading-relaxed">
            <p>
              Thryve Growth Co. started with a pattern I kept seeing — both in
              organizations I worked with and in the individuals I coached on
              the side. Organizations that genuinely wanted to be better but
              didn&apos;t have the HR infrastructure to get there. Individuals who
              were more capable than they knew but couldn&apos;t get out of their
              own way.
            </p>
            <p>
              In both cases, the issue wasn&apos;t a lack of talent or effort. It
              was a lack of clarity — about what the problem really was, what
              success actually looked like, and what needed to happen differently.
            </p>
            <p>
              I started Thryve Growth Co. to fill that gap. To be the resource
              that organizations and individuals needed but often couldn&apos;t find
              — something grounded in real HR experience, focused on practical
              outcomes, and honest enough to tell you what you actually need to
              hear.
            </p>
            <p>
              The name &ldquo;Thryve&rdquo; is intentional. Growth isn&apos;t accidental. It
              requires intention, the right support, and the willingness to do
              the work. That&apos;s what this company is built around — helping you
              thrive on purpose.
            </p>
          </div>

          {/* Pull quote */}
          <div className="mt-10 border-l-4 border-brand-500 pl-6">
            <p className="text-lg font-medium text-neutral-800 leading-relaxed italic">
              &ldquo;I built this because I kept meeting people who needed something
              more than generic advice — and I knew I could give them something
              better.&rdquo;
            </p>
            <p className="mt-3 text-sm font-semibold text-brand-700">
              — Rachel, Founder of Thryve Growth Co.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
