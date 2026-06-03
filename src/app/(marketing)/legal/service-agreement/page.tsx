import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgreementRenderer } from "@/components/legal/AgreementRenderer";
import { getCurrentAgreement } from "@/app/actions/legal";

export const metadata: Metadata = {
  title: "Service Agreement — Thryve Growth Co.",
  description: "The terms that govern services provided by Thryve Growth Co.",
};

export default async function ServiceAgreementPage() {
  const current = await getCurrentAgreement();
  if (!current) notFound();

  return (
    <section className="py-12 lg:py-16 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">
          {current.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 mb-10">
          {current.published_at && (
            <span>
              Effective {new Date(current.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          )}
          <span>·</span>
          <span>Version {current.version_label}</span>
        </div>

        <AgreementRenderer content={current.content} />

        <p className="text-xs text-neutral-400 mt-12 print:hidden">
          To save a copy: use your browser&apos;s Print → Save as PDF option.
        </p>
      </div>
    </section>
  );
}
