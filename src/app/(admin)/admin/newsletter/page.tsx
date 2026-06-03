import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users, Mail, Send, TrendingUp, CalendarClock, Lightbulb } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { Button } from "@/components/ui/button";
import { IdeaInbox } from "@/components/admin/IdeaInbox";

export const metadata: Metadata = {
  title: "Newsletter — Admin",
  robots: { index: false, follow: false },
};

type IssueRow = {
  id: string;
  title: string;
  subject: string;
  status: string;
  sent_at: string | null;
  scheduled_for: string | null;
  sent_count: number;
};

type StatRow = {
  issue_id: string;
  title: string;
  sent_at: string | null;
  sent_count: number;
  unique_opens: number;
  unique_clicks: number;
};

type IdeaRow = { id: string; body: string; created_at: string };

export default async function NewsletterDashboardPage() {
  const supabase = createServiceClient();

  const { count: subscriberCount } = await supabase
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true })
    .is("unsubscribed_at", null);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: newThisMonth } = await supabase
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true })
    .gte("subscribed_at", thirtyDaysAgo)
    .is("unsubscribed_at", null);

  const { count: scheduledCount } = await supabase
    .from("newsletter_issues")
    .select("*", { count: "exact", head: true })
    .eq("status", "scheduled");

  const { data: scheduledRaw } = await supabase
    .from("newsletter_issues")
    .select("id, title, subject, status, sent_at, scheduled_for, sent_count")
    .eq("status", "scheduled")
    .order("scheduled_for", { ascending: true })
    .limit(5);
  const scheduled = (scheduledRaw ?? []) as IssueRow[];

  const { data: recentRaw } = await supabase
    .from("newsletter_issue_stats")
    .select("issue_id, title, sent_at, sent_count, unique_opens, unique_clicks")
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(5);
  const recent = (recentRaw ?? []) as StatRow[];

  const { data: ideasRaw } = await supabase
    .from("newsletter_ideas")
    .select("id, body, created_at")
    .is("used_in_issue_id", null)
    .order("created_at", { ascending: false })
    .limit(20);
  const ideas = (ideasRaw ?? []) as IdeaRow[];

  const stats = [
    {
      label: "Active subscribers",
      value: subscriberCount ?? 0,
      icon: Users,
      href: "/admin/newsletter/subscribers",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "New (30 days)",
      value: newThisMonth ?? 0,
      icon: TrendingUp,
      href: "/admin/newsletter/subscribers",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Scheduled",
      value: scheduledCount ?? 0,
      icon: CalendarClock,
      href: "/admin/newsletter/issues",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Total sent",
      value: recent.reduce((sum, r) => sum + r.sent_count, 0),
      icon: Send,
      href: "/admin/newsletter/issues",
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Newsletter</h1>
          <p className="text-sm text-neutral-500 mt-1">Weekly emails to your subscribers — plan, draft, schedule.</p>
        </div>
        <Button asChild>
          <Link href="/admin/newsletter/issues/new">
            <Plus className="h-4 w-4" /> New issue
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-brand-200 transition-colors"
            >
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="text-sm text-neutral-500 mt-0.5">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-neutral-200">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Scheduled
            </h2>
            <Link href="/admin/newsletter/issues" className="text-sm text-brand-700 font-medium hover:text-brand-800">
              View all →
            </Link>
          </div>
          {scheduled.length === 0 ? (
            <div className="px-6 py-8 text-sm text-neutral-400 text-center">Nothing scheduled.</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {scheduled.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/admin/newsletter/issues/${issue.id}`}
                  className="block px-6 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <p className="text-sm font-medium text-neutral-900 truncate">{issue.title || issue.subject}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {issue.scheduled_for
                      ? new Date(issue.scheduled_for).toLocaleString()
                      : "—"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-neutral-200">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand-600" />
              Recently sent
            </h2>
            <Link href="/admin/newsletter/issues" className="text-sm text-brand-700 font-medium hover:text-brand-800">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-6 py-8 text-sm text-neutral-400 text-center">No newsletters sent yet.</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recent.map((row) => {
                const openRate = row.sent_count > 0
                  ? Math.round((row.unique_opens / row.sent_count) * 100)
                  : 0;
                const clickRate = row.sent_count > 0
                  ? Math.round((row.unique_clicks / row.sent_count) * 100)
                  : 0;
                return (
                  <Link
                    key={row.issue_id}
                    href={`/admin/newsletter/issues/${row.issue_id}`}
                    className="block px-6 py-4 hover:bg-neutral-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-neutral-900 truncate">{row.title}</p>
                    <div className="flex items-center gap-4 text-xs text-neutral-500 mt-1">
                      <span>{row.sent_count} sent</span>
                      <span>·</span>
                      <span>{openRate}% opens</span>
                      <span>·</span>
                      <span>{clickRate}% clicks</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Idea inbox
          </h2>
          <p className="text-xs text-neutral-500 mt-1">Capture rough notes here. Nothing is sent automatically.</p>
        </div>
        <div className="px-6 py-5">
          <IdeaInbox ideas={ideas} />
        </div>
      </div>
    </div>
  );
}
