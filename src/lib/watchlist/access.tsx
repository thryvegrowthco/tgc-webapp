// Subscription access-gating for the Job Alerts / Watchlist dashboard sections.
//
// The product is pay-first: a Stripe subscription auto-activates the watchlist.
// When the subscription is anything other than 'active' (paused, inactive,
// cancelled, expired) we hide the job-alerts content and show a reactivate CTA.
// This gates ONLY the watchlist sections — booking/coaching clients have no
// subscription and keep full dashboard access.

import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";

export interface WatchlistAccess {
  allowed: boolean;
  status: string;
}

export function getWatchlistAccess(subscriptionStatus: string | null | undefined): WatchlistAccess {
  const status = subscriptionStatus ?? "inactive";
  return { allowed: status === "active", status };
}

const STATUS_MESSAGE: Record<string, string> = {
  paused: "Your Job Alerts subscription is paused.",
  inactive: "Your Job Alerts subscription is inactive.",
  cancelled: "Your Job Alerts subscription has been cancelled.",
  expired: "Your Job Alerts subscription has expired.",
};

export function WatchlistInactiveNotice({ status }: { status: string }) {
  const message = STATUS_MESSAGE[status] ?? "Your Job Alerts subscription is not active.";
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Job Watchlist</h1>
        <p className="text-neutral-500 mt-1 text-sm">Curated job matches delivered to you.</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-5 w-5 text-amber-600" />
        </div>
        <h3 className="font-display font-bold text-neutral-900 mb-2">{message}</h3>
        <p className="text-sm text-neutral-500 mb-5 max-w-sm mx-auto">
          Reactivate your subscription to keep receiving curated job matches and to access your
          watchlist and applications.
        </p>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-1 text-sm font-medium text-white bg-brand-700 hover:bg-brand-800 rounded-lg px-4 py-2.5"
        >
          Manage billing <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
