import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCentralDate } from "@/lib/time/central";
import { PackageRedeemClient } from "@/components/dashboard/PackageRedeemClient";
import type { SessionPackage } from "@/types/database";

export const metadata = { title: "My Packages — Thryve Growth Co." };

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-700" },
  exhausted: { label: "Fully used", className: "bg-neutral-100 text-neutral-600" },
  expired: { label: "Expired", className: "bg-red-100 text-red-700" },
  refunded: { label: "Refunded", className: "bg-neutral-100 text-neutral-600" },
};

export default async function PackagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/packages");

  const { data: rows } = await supabase
    .from("session_packages")
    .select("id, service_type, sessions_total, sessions_used, status, purchased_at, expires_at")
    .eq("client_id", user.id)
    .order("purchased_at", { ascending: false });
  const packages = (rows ?? []) as SessionPackage[];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-neutral-900">My Packages</h1>
        <p className="text-neutral-500 mt-1 text-sm">Sessions you&apos;ve purchased as a package — book the rest here, no extra payment.</p>
      </div>

      {packages.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center">
          <Package className="h-6 w-6 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">You don&apos;t have any session packages yet.</p>
          <Link href="/book" className="text-sm text-brand-700 hover:underline mt-2 inline-block">
            Browse coaching &amp; interview packages
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => {
            const remaining = pkg.sessions_total - pkg.sessions_used;
            const expired = pkg.status === "expired" || (pkg.expires_at != null && new Date(pkg.expires_at) < new Date());
            const badge = STATUS_BADGE[expired ? "expired" : pkg.status] ?? STATUS_BADGE.active;
            const canBook = pkg.status === "active" && remaining > 0 && !expired;
            return (
              <div key={pkg.id} className="bg-white border border-neutral-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-neutral-900">{pkg.service_type}</p>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      <span className="font-medium text-neutral-900">{pkg.sessions_used} of {pkg.sessions_total}</span> sessions used
                      {remaining > 0 && pkg.status === "active" && (
                        <span className="text-neutral-500"> · {remaining} remaining</span>
                      )}
                    </p>
                    {pkg.expires_at && pkg.status === "active" && !expired && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Use by {formatCentralDate(pkg.expires_at, { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${Math.round((pkg.sessions_used / pkg.sessions_total) * 100)}%` }}
                  />
                </div>

                {canBook ? (
                  <PackageRedeemClient packageId={pkg.id} />
                ) : pkg.status === "exhausted" ? (
                  <p className="mt-3 text-xs text-green-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All sessions booked.
                  </p>
                ) : expired ? (
                  <p className="mt-3 text-xs text-neutral-500">Expired — contact Rachel if you have remaining sessions.</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
