import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HELP_DOCS, HELP_CATEGORY_ORDER } from "@/lib/help/docs";

export const metadata: Metadata = {
  title: "Help — Admin",
  robots: { index: false, follow: false },
};

export default function HelpIndexPage() {
  return (
    <div className="space-y-8">
      {HELP_CATEGORY_ORDER.map((category) => {
        const docs = HELP_DOCS.filter((d) => d.category === category);
        if (docs.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {docs.map((d) => (
                <Link
                  key={d.slug}
                  href={`/admin/help/${d.slug}`}
                  className="group block rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <p className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                    {d.title}
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                  </p>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{d.description}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
