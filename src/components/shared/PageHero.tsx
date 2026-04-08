import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  description?: string;
  badge?: string;
  badgeColor?: "brand" | "blue" | "neutral";
  children?: React.ReactNode;
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  titleAccent,
  description,
  badge,
  badgeColor = "brand",
  children,
  className,
}: PageHeroProps) {
  const badgeClasses = {
    brand: "bg-brand-100 text-brand-800",
    blue: "bg-blue-100 text-blue-800",
    neutral: "bg-neutral-100 text-neutral-700",
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50",
        "py-16 lg:py-24 border-b border-neutral-100",
        className
      )}
    >
      {/* Decorative blob */}
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand-100 opacity-40 blur-3xl pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {badge && (
            <span
              className={cn(
                "inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest mb-4",
                badgeClasses[badgeColor]
              )}
            >
              {badge}
            </span>
          )}

          {eyebrow && (
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">
                {eyebrow}
              </span>
            </div>
          )}

          <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
            {title}
            {titleAccent && (
              <>
                {" "}
                <span className="text-brand-700">{titleAccent}</span>
              </>
            )}
          </h1>

          {description && (
            <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}

          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </section>
  );
}
