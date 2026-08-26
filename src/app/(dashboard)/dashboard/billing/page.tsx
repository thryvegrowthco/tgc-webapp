import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, AlertCircle, CheckCircle2, ArrowRight, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createPortalSession } from "@/app/actions/billing";

type BillingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // maybeSingle, not single — a coaching-only client has no row, and .single()
  // logged a PostgREST error on every render.
  const { data: watchlist } = await supabase
    .from("watchlist_profiles")
    .select("subscription_status, stripe_subscription_id, access_source, comp_note, comped_until, updated_at")
    .eq("client_id", user.id)
    .maybeSingle();

  const hasSubscription = Boolean(watchlist?.stripe_subscription_id);
  // Complimentary access: real access, but no Stripe customer, so none of the
  // billing-portal UI applies. Without this branch they'd see the "No active
  // subscription" upsell while the watchlist works fine.
  const isComped =
    watchlist?.access_source === "comped" && watchlist?.subscription_status === "active";
  const compEndsOn = watchlist?.comped_until
    ? new Date(watchlist.comped_until).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  let nextBillingDate: string | null = null;
  let cancelAtPeriodEnd = false;
  let amount: string | null = null;

  if (hasSubscription && watchlist?.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(watchlist.stripe_subscription_id);
      const item = subscription.items.data[0];
      if (item?.current_period_end) {
        nextBillingDate = new Date(item.current_period_end * 1000).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
      cancelAtPeriodEnd = subscription.cancel_at_period_end;
      const price = item?.price;
      if (price?.unit_amount && price.currency) {
        amount = `$${(price.unit_amount / 100).toFixed(0)}/${price.recurring?.interval ?? "month"}`;
      }
    } catch (err) {
      console.error("[Billing] Failed to retrieve subscription:", err);
    }
  }

  const status = watchlist?.subscription_status ?? "none";
  const statusLabel = formatStatusLabel(status, cancelAtPeriodEnd);
  const statusColor = statusColorClass(status, cancelAtPeriodEnd);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Billing</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Manage your Job Alerts &amp; Watchlist subscription.
        </p>
      </div>

      {error === "no_subscription" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">No active subscription</p>
            <p className="text-amber-800 mt-0.5">
              You don&apos;t have an active Job Alerts subscription yet.
            </p>
          </div>
        </div>
      )}

      {hasSubscription ? (
        <>
          <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-display font-bold text-neutral-900">Job Alerts &amp; Watchlists</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Monthly subscription</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">Plan</dt>
                <dd className="font-medium text-neutral-800">{amount ?? "Monthly Support"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                  {cancelAtPeriodEnd ? "Ends" : "Next billing date"}
                </dt>
                <dd className="font-medium text-neutral-800">{nextBillingDate ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">Status</dt>
                <dd className="font-medium text-neutral-800 capitalize">{status}</dd>
              </div>
            </dl>
          </div>

          {cancelAtPeriodEnd && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <AlertCircle className="h-5 w-5 text-neutral-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-neutral-900">Subscription set to cancel</p>
                <p className="text-neutral-600 mt-0.5">
                  Your access continues through {nextBillingDate}. You can reactivate anytime in the billing portal.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <h2 className="font-display font-bold text-neutral-900 mb-2">Manage your subscription</h2>
            <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
              Update your payment method, download invoices, pause, or cancel from the secure Stripe portal.
            </p>
            <form action={createPortalSession}>
              <Button type="submit" size="lg">
                Open Billing Portal
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      ) : isComped ? (
        <>
          <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-50 rounded-lg">
                  <Gift className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-display font-bold text-neutral-900">Job Alerts &amp; Watchlists</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Complimentary access</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-100 text-brand-800">
                Active
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">Cost</dt>
                <dd className="font-medium text-neutral-800">$0 — on the house</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                  {compEndsOn ? "Access through" : "Payment method"}
                </dt>
                <dd className="font-medium text-neutral-800">{compEndsOn ?? "None needed"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">Status</dt>
                <dd className="font-medium text-neutral-800">Active</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <h2 className="font-display font-bold text-neutral-900 mb-2">Nothing to pay</h2>
            <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
              Rachel set up your Job Alerts &amp; Watchlist at no cost, so there&apos;s no card on
              file and no invoices to download.
              {compEndsOn
                ? ` Your complimentary access runs through ${compEndsOn} — subscribe any time to keep it going.`
                : " If you'd ever like to move to a paid subscription, you can start one here."}
            </p>
            <Button asChild variant="outline" size="lg">
              <Link href="/services/job-alerts">
                See the Job Alerts plan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <EmptyState
            icon={CheckCircle2}
            title="No active subscription"
            description="Start your Job Alerts &amp; Watchlist to get curated job matches in your dashboard each week."
            action={
              <Button asChild size="sm">
                <Link href="/services/job-alerts">View Job Alerts</Link>
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}

function formatStatusLabel(status: string, cancelAtPeriodEnd: boolean): string {
  if (cancelAtPeriodEnd) return "Cancelling";
  switch (status) {
    case "active": return "Active";
    case "trialing": return "Trial";
    case "past_due": return "Past Due";
    case "cancelled":
    case "canceled": return "Cancelled";
    case "unpaid": return "Unpaid";
    case "paused": return "Paused";
    default: return status;
  }
}

function statusColorClass(status: string, cancelAtPeriodEnd: boolean): string {
  if (cancelAtPeriodEnd) return "bg-amber-100 text-amber-800";
  switch (status) {
    case "active": return "bg-green-100 text-green-700";
    case "trialing": return "bg-blue-100 text-blue-700";
    case "past_due":
    case "unpaid": return "bg-red-100 text-red-700";
    case "cancelled":
    case "canceled": return "bg-neutral-100 text-neutral-600";
    case "paused": return "bg-amber-100 text-amber-800";
    default: return "bg-neutral-100 text-neutral-600";
  }
}
