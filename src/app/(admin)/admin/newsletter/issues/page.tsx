import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Newsletter issues — Admin",
  robots: { index: false, follow: false },
};

type IssueRow = {
  id: string;
  title: string;
  subject: string;
  status: "draft" | "pending_approval" | "scheduled" | "sending" | "sent" | "failed";
  scheduled_for: string | null;
  sent_at: string | null;
  sent_count: number;
  updated_at: string;
};

const STATUS_GROUPS: Record<string, IssueRow["status"][]> = {
  Drafts: ["draft", "pending_approval"],
  Scheduled: ["scheduled", "sending"],
  Sent: ["sent", "failed"],
};

const statusLabels: Record<IssueRow["status"], string> = {
  draft: "Draft",
  pending_approval: "Pending",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
};

const statusStyles: Record<IssueRow["status"], string> = {
  draft: "bg-neutral-100 text-neutral-700",
  pending_approval: "bg-amber-100 text-amber-700",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-purple-100 text-purple-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default async function IssuesListPage() {
  const supabase = createServiceClient();
  const { data: issuesRaw, error } = await supabase
    .from("newsletter_issues")
    .select("id, title, subject, status, scheduled_for, sent_at, sent_count, updated_at")
    .order("updated_at", { ascending: false });

  const issues = (issuesRaw ?? []) as IssueRow[];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Issues</h1>
          <p className="text-sm text-neutral-500 mt-1">{issues.length} total</p>
        </div>
        <Button asChild>
          <Link href="/admin/newsletter/issues/new">
            <Plus className="h-4 w-4" /> New issue
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Could not load issues — {error.message}
        </div>
      )}

      {issues.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200">
          <EmptyState
            icon={Mail}
            title="No newsletter issues yet."
            description="Write your first weekly issue to get started."
            action={
              <Button asChild size="sm">
                <Link href="/admin/newsletter/issues/new">
                  <Plus className="h-4 w-4" /> New issue
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(STATUS_GROUPS).map(([groupName, statuses]) => {
            const groupIssues = issues.filter((i) => statuses.includes(i.status));
            if (groupIssues.length === 0) return null;
            return (
              <section key={groupName}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  {groupName} ({groupIssues.length})
                </h2>
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="divide-y divide-neutral-100">
                    {groupIssues.map((issue) => (
                      <Link
                        key={issue.id}
                        href={`/admin/newsletter/issues/${issue.id}`}
                        className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusStyles[issue.status]}`}>
                              {statusLabels[issue.status]}
                            </span>
                            <p className="font-medium text-neutral-900 text-sm truncate">
                              {issue.title || issue.subject || "(untitled)"}
                            </p>
                          </div>
                          {issue.subject && issue.title !== issue.subject && (
                            <p className="text-xs text-neutral-500 truncate">Subject: {issue.subject}</p>
                          )}
                          <p className="text-xs text-neutral-400 mt-1">
                            {issue.sent_at
                              ? `Sent ${new Date(issue.sent_at).toLocaleString()} · ${issue.sent_count} subscribers`
                              : issue.scheduled_for
                              ? `Scheduled for ${new Date(issue.scheduled_for).toLocaleString()}`
                              : `Updated ${new Date(issue.updated_at).toLocaleString()}`}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
