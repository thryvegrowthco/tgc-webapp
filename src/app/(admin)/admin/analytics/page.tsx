import type { Metadata } from "next";
import { DollarSign, Calendar, CheckCircle2, XCircle, Clock, Users, Bell, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Analytics — Admin",
  robots: { index: false, follow: false },
};

function formatCurrency(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatMonth(yyyyMM: string) {
  const [year, month] = yyyyMM.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // Date helpers
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7; // 0 = Monday
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday).toISOString();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  // Run all queries in parallel
  const [
    { data: allPayments },
    { data: monthPayments },
    { data: weekPayments },
    { count: confirmedCount },
    { count: completedCount },
    { count: cancelledCount },
    { count: pendingCount },
    { data: allBookings },
    { count: activeSubscribers },
    { count: newClientsThisMonth },
    { data: recentPayments },
  ] = await Promise.all([
    supabase.from("payments").select("amount_cents").eq("status", "paid"),
    supabase.from("payments").select("amount_cents").eq("status", "paid").gte("created_at", monthStart),
    supabase.from("payments").select("amount_cents").eq("status", "paid").gte("created_at", weekStart),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bookings").select("service_type"),
    supabase.from("watchlist_profiles").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "admin").gte("created_at", monthStart),
    supabase.from("payments").select("created_at, amount_cents").eq("status", "paid").gte("created_at", sixMonthsAgo),
  ]);

  // Aggregate revenue
  const allTimeRevenue = (allPayments ?? []).reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
  const monthRevenue = (monthPayments ?? []).reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
  const weekRevenue = (weekPayments ?? []).reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);

  // Most popular services
  const serviceCounts = new Map<string, number>();
  for (const b of allBookings ?? []) {
    const key = b.service_type ?? "Unknown";
    serviceCounts.set(key, (serviceCounts.get(key) ?? 0) + 1);
  }
  const topServices = [...serviceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Monthly revenue — group by YYYY-MM
  const monthlyMap = new Map<string, number>();
  for (const p of recentPayments ?? []) {
    const key = (p.created_at as string).slice(0, 7); // "YYYY-MM"
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (p.amount_cents ?? 0));
  }
  // Build last 6 months in order (including months with $0)
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue.push({ month: key, revenue: monthlyMap.get(key) ?? 0 });
  }

  const revenueCards = [
    { label: "All-Time Revenue", value: formatCurrency(allTimeRevenue), icon: DollarSign, color: "text-brand-600", bg: "bg-brand-50" },
    { label: "This Month", value: formatCurrency(monthRevenue), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "This Week", value: formatCurrency(weekRevenue), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  const bookingCards = [
    { label: "Confirmed", value: confirmedCount ?? 0, icon: Calendar, color: "text-green-600", bg: "bg-green-50" },
    { label: "Completed", value: completedCount ?? 0, icon: CheckCircle2, color: "text-neutral-600", bg: "bg-neutral-100" },
    { label: "Cancelled", value: cancelledCount ?? 0, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Pending", value: pendingCount ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Analytics</h1>
        <p className="text-sm text-neutral-500 mt-1">Business overview from your Supabase data.</p>
      </div>

      {/* Revenue */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Revenue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {revenueCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl border border-neutral-200 p-5">
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
                <p className="text-sm text-neutral-500 mt-0.5">{card.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bookings by status */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Bookings by Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {bookingCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl border border-neutral-200 p-5">
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
                <p className="text-sm text-neutral-500 mt-0.5">{card.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Subscribers & services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscribers & clients */}
        <section className="bg-white rounded-xl border border-neutral-200">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h2 className="font-semibold text-neutral-900">Subscribers & Clients</h2>
          </div>
          <div className="divide-y divide-neutral-100">
            <div className="px-6 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{activeSubscribers ?? 0}</p>
                <p className="text-sm text-neutral-500">Active Job Alerts subscribers</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{newClientsThisMonth ?? 0}</p>
                <p className="text-sm text-neutral-500">New clients this month</p>
              </div>
            </div>
          </div>
        </section>

        {/* Most popular services */}
        <section className="bg-white rounded-xl border border-neutral-200">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h2 className="font-semibold text-neutral-900">Most Popular Services</h2>
          </div>
          {topServices.length === 0 ? (
            <p className="px-6 py-8 text-sm text-neutral-400 text-center">No bookings yet.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {topServices.map(([service, count]) => (
                <div key={service} className="px-6 py-3 flex items-center justify-between gap-4">
                  <p className="text-sm text-neutral-800 truncate">{service}</p>
                  <span className="text-sm font-semibold text-neutral-900 flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Monthly revenue table */}
      <section className="bg-white rounded-xl border border-neutral-200">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">Monthly Revenue — Last 6 Months</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-6 py-3 font-medium text-neutral-500">Month</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {monthlyRevenue.map(({ month, revenue }) => (
                <tr key={month}>
                  <td className="px-6 py-3 text-neutral-800">{formatMonth(month)}</td>
                  <td className="px-6 py-3 text-neutral-900 font-medium text-right">{formatCurrency(revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
