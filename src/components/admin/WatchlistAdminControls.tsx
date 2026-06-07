"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  setWatchlistReviewStatus,
  pauseWatchlist,
  reactivateWatchlist,
  cancelWatchlist,
} from "@/app/actions/watchlist";

interface Props {
  clientId: string;
  subscriptionStatus: string;
  reviewStatus: "pending_review" | "reviewed";
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  inactive: "bg-neutral-100 text-neutral-500",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
};

export function WatchlistAdminControls({ clientId, subscriptionStatus, reviewStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(
    action: string,
    fn: () => Promise<{ error?: string; success?: boolean } | void>,
    ok: string
  ) {
    setBusy(action);
    const result = await fn();
    setBusy(null);
    if (result && "error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success(ok);
      router.refresh();
    }
  }

  const isReviewed = reviewStatus === "reviewed";
  const badge = STATUS_BADGE[subscriptionStatus] ?? "bg-neutral-100 text-neutral-500";

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-500">Subscription:</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${badge}`}>
            {subscriptionStatus}
          </span>
          {!isReviewed && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              Pending review
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={isReviewed ? "outline" : "default"}
          disabled={busy !== null}
          onClick={() =>
            run(
              "review",
              () => setWatchlistReviewStatus(clientId, !isReviewed),
              isReviewed ? "Marked pending review." : "Marked reviewed."
            )
          }
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {isReviewed ? "Mark pending" : "Mark reviewed"}
        </Button>

        {subscriptionStatus !== "paused" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => run("pause", () => pauseWatchlist(clientId), "Watchlist paused.")}
          >
            <PauseCircle className="h-3.5 w-3.5" /> Pause
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => run("resume", () => reactivateWatchlist(clientId), "Watchlist reactivated.")}
          >
            <PlayCircle className="h-3.5 w-3.5" /> Reactivate
          </Button>
        )}

        {(subscriptionStatus === "cancelled" || subscriptionStatus === "expired" || subscriptionStatus === "inactive") && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => run("resume", () => reactivateWatchlist(clientId), "Watchlist reactivated.")}
          >
            <PlayCircle className="h-3.5 w-3.5" /> Reactivate
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={busy !== null || subscriptionStatus === "cancelled"}
          onClick={() => {
            if (!confirm("Cancel this client's Job Alerts subscription? This cancels billing in Stripe.")) return;
            run("cancel", () => cancelWatchlist(clientId), "Subscription cancelled.");
          }}
        >
          <XCircle className="h-3.5 w-3.5" /> Cancel service
        </Button>
      </div>
    </div>
  );
}
