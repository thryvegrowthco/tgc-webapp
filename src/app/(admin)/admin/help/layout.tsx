// Help center shell — a consistent header + global search across the index and
// every doc page. Admin gating is handled by the parent (admin) layout. The
// header is hidden when printing a doc.

import { LifeBuoy } from "lucide-react";
import { buildSearchIndex } from "@/lib/help/docs";
import { DocSearch } from "@/components/help/DocSearch";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const index = buildSearchIndex();
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-brand-600" /> Help Center
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Guides and references for running Thryve. Searchable, and printable to PDF.
          </p>
        </div>
        <div className="w-full sm:w-80">
          <DocSearch index={index} />
        </div>
      </div>
      {children}
    </div>
  );
}
