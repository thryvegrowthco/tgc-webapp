import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, MousePointerClick, Eye } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { NewsletterIssueForm } from "@/components/admin/NewsletterIssueForm";
import { DeleteIssueButton } from "@/components/admin/DeleteIssueButton";
import type { JSONContent } from "@tiptap/react";

export const metadata: Metadata = {
  title: "Edit issue — Newsletter",
  robots: { index: false, follow: false },
};

type IssueRow = {
  id: string;
  title: string;
  subject: string;
  preheader: string;
  content: JSONContent;
  status: "draft" | "pending_approval" | "scheduled" | "sending" | "sent" | "failed";
  scheduled_for: string | null;
  sent_at: string | null;
  sent_count: number;
  target_interests: string[];
  featured_blog_post_id: string | null;
  template_id: string | null;
};

type StatRow = {
  delivered: number;
  unique_opens: number;
  unique_clicks: number;
  bounces: number;
  complaints: number;
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditIssuePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: issueRaw } = await supabase
    .from("newsletter_issues")
    .select("id, title, subject, preheader, content, status, scheduled_for, sent_at, sent_count, target_interests, featured_blog_post_id, template_id")
    .eq("id", id)
    .single();

  if (!issueRaw) notFound();
  const issue = issueRaw as unknown as IssueRow;

  const { data: blogsRaw } = await supabase
    .from("blog_posts")
    .select("id, title")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(50);
  const blogOptions = (blogsRaw ?? []) as Array<{ id: string; title: string }>;

  const { data: statsRaw } = await supabase
    .from("newsletter_issue_stats")
    .select("delivered, unique_opens, unique_clicks, bounces, complaints")
    .eq("issue_id", id)
    .maybeSingle();
  const stats = (statsRaw as StatRow | null) ?? null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/newsletter/issues"
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:text-brand-800 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to issues
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-neutral-900">
              {issue.title || "(untitled)"}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Last updated · status: <span className="font-medium">{issue.status}</span>
            </p>
          </div>
          {issue.status !== "sent" && issue.status !== "sending" && (
            <DeleteIssueButton id={id} />
          )}
        </div>
      </div>

      {stats && issue.status === "sent" && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatTile label="Delivered" value={stats.delivered} icon={Eye} />
          <StatTile label="Opens" value={stats.unique_opens} icon={Eye} accent="green" />
          <StatTile label="Clicks" value={stats.unique_clicks} icon={MousePointerClick} accent="blue" />
          <StatTile label="Bounces" value={stats.bounces} icon={Trash2} accent="red" />
          <StatTile label="Complaints" value={stats.complaints} icon={Trash2} accent="red" />
        </div>
      )}

      <NewsletterIssueForm
        mode="edit"
        initialData={{
          id: issue.id,
          title: issue.title,
          subject: issue.subject,
          preheader: issue.preheader,
          content: issue.content,
          status: issue.status,
          scheduledFor: issue.scheduled_for,
          targetInterests: issue.target_interests,
          featuredBlogPostId: issue.featured_blog_post_id,
          templateId: issue.template_id,
          sentAt: issue.sent_at,
          sentCount: issue.sent_count,
        }}
        blogOptions={blogOptions}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent = "neutral",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: "green" | "blue" | "red" | "neutral";
}) {
  const colors = {
    green: "text-green-600 bg-green-50",
    blue: "text-blue-600 bg-blue-50",
    red: "text-red-600 bg-red-50",
    neutral: "text-neutral-600 bg-neutral-50",
  };
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className={`w-7 h-7 rounded-lg ${colors[accent]} flex items-center justify-center mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
