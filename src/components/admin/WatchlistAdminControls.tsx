"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, PauseCircle, PlayCircle, XCircle, Gift, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrantWatchlistAccessDialog } from "@/components/admin/GrantWatchlistAccessDialog";
import {
  setWatchlistReviewStatus,
  pauseWatchlist,
  reactivateWatchlist,
  cancelWatchlist,
  grantComplimentaryAccess,
  revokeComplimentaryAccess,
} from "@/app/actions/watchlist";

interface Props {
  clientId: string;
  clientName?: string;
  /** null when the client has no watchlist_profiles row at all. */
  subscriptionStatus: string | null;
  reviewStatus: "pending_review" | "reviewed";
  accessSource?: "paid" | "comped" | null;
  hasStripeSubscription?: boolean;
  compNote?: string | null;
  compedAt?: string | null;
  compedUntil?: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  inactive: "bg-neutral-100 text-neutral-500",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
};

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function WatchlistAdminControls({
  clientId,
  clientName = "This client",
  subscriptionStatus,
  reviewStatus,
  accessSource = null,
  hasStripeSubscription = false,
  compNote = null,
  compedAt = null,
  compedUntil = null,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [grantOpen, setGrantOpen] = React.useState(false);

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
  // No row at all — the client has never had Job Alerts. Grant is the only verb.
  const noProfile = subscriptionStatus === null;
  const isComped = accessSource === "comped";
  const isActive = subscriptionStatus === "active";
  const compActive = isComped && isActive;

  const grantedOn = formatDate(compedAt);
  const endsOn = formatDate(compedUntil);

  function handleGrant({ note, until }: { note: string; until: string }) {
    setBusy("grant");
    grantComplimentaryAccess(clientId, {
      note: note || null,
      // A plain date means "through that day" — anchor to noon UTC so the
      // sweep can't clip it early in Central time.
      until: until ? new Date(`${until}T12:00:00Z`).toISOString() : null,
    }).then((result) => {
      setBusy(null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setGrantOpen(false);
      toast.success("Free access granted.");
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-neutral-500">Job Alerts:</span>

          {noProfile ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
              No access
            </span>
          ) : isComped ? (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                compActive ? "bg-brand-100 text-brand-800" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {compActive ? "Comped · Active" : "Comped · Ended"}
            </span>
          ) : (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                STATUS_BADGE[subscriptionStatus] ?? "bg-neutral-100 text-neutral-500"
              }`}
            >
              {subscriptionStatus}
            </span>
          )}

          {!noProfile && !isReviewed && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              Pending review
            </span>
          )}
        </div>
      </div>

      {/* Comp provenance — why, who, and when it ends. */}
      {isComped && (grantedOn || endsOn || compNote) && (
        <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2 text-xs text-neutral-600 space-y-0.5">
          {compNote && <p className="text-neutral-700">{compNote}</p>}
          <p>
            {grantedOn && <>Granted {grantedOn}</>}
            {grantedOn && endsOn && " · "}
            {endsOn && (compActive ? <>Ends {endsOn}</> : <>Ended {endsOn}</>)}
            {!endsOn && grantedOn && compActive && " · No end date"}
          </p>
        </div>
      )}

      {/* Paid client with no Stripe sub on file: Pause/Cancel are local-only. */}
      {!noProfile && !isComped && !hasStripeSubscription && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No Stripe subscription on file — Pause and Cancel change access here only, with no
          billing effect.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!noProfile && (
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
        )}

        {/* ── Comped or no-profile: free-access verbs only ──────────────────── */}
        {(noProfile || isComped) && (
          <>
            {compActive ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => {
                  if (
                    !confirm(
                      "Remove this client's free Job Alerts access? No billing is involved — they simply lose access."
                    )
                  )
                    return;
                  run(
                    "revoke",
                    () => revokeComplimentaryAccess(clientId),
                    "Free access removed."
                  );
                }}
              >
                <Ban className="h-3.5 w-3.5" /> Revoke free access
              </Button>
            ) : (
              <Button size="sm" disabled={busy !== null} onClick={() => setGrantOpen(true)}>
                <Gift className="h-3.5 w-3.5" />
                {isComped ? "Re-grant free access" : "Grant free access"}
              </Button>
            )}
          </>
        )}

        {/* ── Paid: the original Stripe lifecycle verbs, unchanged ──────────── */}
        {!noProfile && !isComped && (
          <>
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
                onClick={() =>
                  run("resume", () => reactivateWatchlist(clientId), "Watchlist reactivated.")
                }
              >
                <PlayCircle className="h-3.5 w-3.5" /> Reactivate
              </Button>
            )}

            {(subscriptionStatus === "cancelled" ||
              subscriptionStatus === "expired" ||
              subscriptionStatus === "inactive") && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() =>
                    run("resume", () => reactivateWatchlist(clientId), "Watchlist reactivated.")
                  }
                >
                  <PlayCircle className="h-3.5 w-3.5" /> Reactivate
                </Button>
                {/* An inactive paid row can also be comped instead of resold. */}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy !== null || hasStripeSubscription}
                  onClick={() => setGrantOpen(true)}
                >
                  <Gift className="h-3.5 w-3.5" /> Grant free access
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={busy !== null || subscriptionStatus === "cancelled"}
              onClick={() => {
                if (
                  !confirm(
                    hasStripeSubscription
                      ? "Cancel this client's Job Alerts subscription? This cancels billing in Stripe."
                      : "Cancel this client's Job Alerts access? There is no Stripe subscription, so nothing is billed."
                  )
                )
                  return;
                run("cancel", () => cancelWatchlist(clientId), "Subscription cancelled.");
              }}
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel service
            </Button>
          </>
        )}
      </div>

      <GrantWatchlistAccessDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        clientName={clientName}
        isRegrant={isComped}
        loading={busy === "grant"}
        onConfirm={handleGrant}
      />
    </div>
  );
}
