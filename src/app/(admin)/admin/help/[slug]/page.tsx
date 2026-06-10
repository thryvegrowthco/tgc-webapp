import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDoc, HELP_DOCS } from "@/lib/help/docs";
import { MarkdownDoc } from "@/components/help/MarkdownDoc";
import { PrintButton } from "@/components/help/PrintButton";

export function generateStaticParams() {
  return HELP_DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);
  return {
    title: doc ? `${doc.meta.title} — Help` : "Help — Admin",
    robots: { index: false, follow: false },
  };
}

export default async function HelpDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-8">
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link
            href="/admin/help"
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 print:hidden"
          >
            <ArrowLeft className="h-4 w-4" /> All help
          </Link>
          <PrintButton />
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 print:border-0 print:p-0">
          <MarkdownDoc markdown={doc.markdown} />
        </div>
      </div>

      {doc.toc.length > 0 && (
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">On this page</p>
            <nav className="border-l border-neutral-200">
              {doc.toc.map((t, i) => (
                <a
                  key={`${t.anchor}-${i}`}
                  href={`#${t.anchor}`}
                  className={`block -ml-px border-l-2 border-transparent py-1 text-neutral-500 hover:border-brand-400 hover:text-brand-700 ${
                    t.level === 3 ? "pl-6 text-xs" : "pl-3 text-sm"
                  }`}
                >
                  {t.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
}
