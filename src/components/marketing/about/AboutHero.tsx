import { RachelPhoto } from "@/components/shared/RachelPhoto";

export function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50 py-20 lg:py-28">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-brand-100 opacity-40 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-brand-200 opacity-30 blur-3xl pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Copy — left column */}
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-6">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">
                About
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-6">
              Real Experience.<br />
              <span className="text-brand-700">Real Growth.</span>
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed max-w-xl">
              Thryve Growth Co. was built on one simple belief: that real growth
              requires real honesty. Not the kind of coaching that tells you
              what you want to hear — the kind that helps you see clearly and
              move forward with intention.
            </p>
            <div className="mt-8 flex items-center gap-6 text-sm text-neutral-500">
              <div className="flex items-center gap-1.5">
                <span className="text-brand-600 font-bold">10+</span>
                <span>Years in HR</span>
              </div>
              <div className="w-px h-4 bg-neutral-200" />
              <div className="flex items-center gap-1.5">
                <span className="text-brand-600 font-bold">Thryve</span>
                <span>Growth Co. LLC</span>
              </div>
            </div>
          </div>

          {/* Photo — right column */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm lg:max-w-md">
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-brand-200 to-brand-100 -z-10"
                />
                <RachelPhoto
                  variant="about"
                  priority
                  className="w-full aspect-[4/5] shadow-xl"
                />
              </div>
              {/* Floating name card */}
              <div className="absolute -bottom-4 -left-6 bg-white rounded-xl shadow-lg p-4 border border-neutral-100">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">
                  Founder
                </p>
                <p className="text-sm font-bold text-neutral-900">Rachel</p>
                <p className="text-xs text-brand-700 font-medium">Thryve Growth Co.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
