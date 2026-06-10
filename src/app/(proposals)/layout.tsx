// Public proposal route group — no auth, no marketing Header/Footer. A minimal
// branded shell, mirroring the booking group, so reviewing a proposal feels
// personal and uncluttered. Renders inside the bare root layout.

import Link from "next/link";

export default function ProposalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-muted">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="font-display text-2xl font-bold text-brand-700">Thryve Growth Co.</span>
          </Link>
          <p className="text-sm text-neutral-500 mt-1">Clarity. Accountability. Real Growth.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
