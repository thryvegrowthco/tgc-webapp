import { Printer } from "lucide-react";

// Browser print → "Save as PDF". Mirrors the signed-agreement print button
// (src/app/(admin)/admin/legal/signed/[id]/page.tsx). Hidden in the printout.
export function PrintButton() {
  return (
    <a
      href="javascript:window.print()"
      className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-brand-700 print:hidden"
    >
      <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
    </a>
  );
}
