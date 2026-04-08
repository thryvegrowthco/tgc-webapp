import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics — Admin",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Analytics</h1>
        <p className="text-sm text-neutral-500 mt-1">Vercel Analytics dashboard coming in Phase 8.</p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 px-6 py-10 text-center text-sm text-neutral-400">
        Analytics integration coming soon.
      </div>
    </div>
  );
}
