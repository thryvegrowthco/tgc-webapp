"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NewsletterEditor } from "@/components/admin/NewsletterEditor";
import { NEWSLETTER_INTERESTS } from "@/lib/newsletter/interests";
import {
  createIssue,
  updateIssue,
  submitForApproval,
  approveAndSchedule,
  approveAndSendNow,
  unscheduleIssue,
  duplicateIssue,
} from "@/app/actions/newsletter";
import type { JSONContent } from "@tiptap/react";

type IssueStatus = "draft" | "pending_approval" | "scheduled" | "sending" | "sent" | "failed";

interface BlogOption {
  id: string;
  title: string;
}

interface InitialData {
  id?: string;
  title: string;
  subject: string;
  preheader: string;
  content: JSONContent;
  status: IssueStatus;
  scheduledFor: string | null;
  targetInterests: string[];
  featuredBlogPostId: string | null;
  templateId: string | null;
  sentAt: string | null;
  sentCount: number;
}

interface NewsletterIssueFormProps {
  mode: "new" | "edit";
  initialData: InitialData;
  blogOptions: BlogOption[];
}

// Compute next Tuesday at 9 AM ET as a default for new schedules.
// 9 AM ET is 13:00 UTC during EDT (Mar-Nov) and 14:00 UTC during EST.
// We use 14:00 UTC year-round; close enough — the cron is hourly anyway.
function nextTuesdayNineAmET(): string {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(14, 0, 0, 0);
  const daysUntilTuesday = (2 - target.getUTCDay() + 7) % 7;
  target.setUTCDate(target.getUTCDate() + (daysUntilTuesday === 0 && target <= now ? 7 : daysUntilTuesday));
  // datetime-local input expects YYYY-MM-DDTHH:mm in local time
  return toDatetimeLocal(target);
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewsletterIssueForm({ mode, initialData, blogOptions }: NewsletterIssueFormProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState(initialData.title);
  const [subject, setSubject] = React.useState(initialData.subject);
  const [preheader, setPreheader] = React.useState(initialData.preheader);
  const [content, setContent] = React.useState<JSONContent>(initialData.content);
  const [targetInterests, setTargetInterests] = React.useState<string[]>(initialData.targetInterests);
  const [featuredBlogPostId, setFeaturedBlogPostId] = React.useState<string | null>(
    initialData.featuredBlogPostId
  );
  const [scheduledFor, setScheduledFor] = React.useState<string>(
    initialData.scheduledFor
      ? toDatetimeLocal(new Date(initialData.scheduledFor))
      : nextTuesdayNineAmET()
  );

  const [saving, setSaving] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [testSending, setTestSending] = React.useState(false);

  const status = initialData.status;
  const isFinal = status === "sent" || status === "sending";
  const isScheduled = status === "scheduled";

  function toggleInterest(slug: string) {
    setTargetInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function persist(): Promise<string | null> {
    setSaving(true);
    try {
      const payload = {
        title,
        subject,
        preheader,
        content,
        target_interests: targetInterests,
        featured_blog_post_id: featuredBlogPostId,
        template_id: initialData.templateId,
      };

      if (mode === "new") {
        const result = await createIssue(payload);
        if (result.error) {
          toast.error(result.error);
          return null;
        }
        return result.id ?? null;
      } else {
        const result = await updateIssue(initialData.id!, payload);
        if (result.error) {
          toast.error(result.error);
          return null;
        }
        return initialData.id!;
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    const id = await persist();
    if (!id) return;
    toast.success("Draft saved");
    if (mode === "new") router.push(`/admin/newsletter/issues/${id}`);
    else router.refresh();
  }

  async function handleSubmitForApproval() {
    const id = await persist();
    if (!id) return;
    const result = await submitForApproval(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Submitted for approval");
    router.refresh();
  }

  async function handleApproveAndSchedule() {
    const id = await persist();
    if (!id) return;
    const whenIso = new Date(scheduledFor).toISOString();
    const result = await approveAndSchedule(id, whenIso);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Scheduled for ${new Date(whenIso).toLocaleString()}`);
    router.refresh();
  }

  async function handleSendNow() {
    if (!window.confirm("Send this newsletter to all matching subscribers now?")) return;
    const id = await persist();
    if (!id) return;
    const result = await approveAndSendNow(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Sent to ${result.sent} subscribers${result.failed ? `, ${result.failed} failed` : ""}`);
    router.push(`/admin/newsletter/issues/${id}`);
    router.refresh();
  }

  async function handleUnschedule() {
    if (!initialData.id) return;
    const result = await unscheduleIssue(initialData.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Reverted to draft");
    router.refresh();
  }

  async function handleDuplicate() {
    if (!initialData.id) return;
    const result = await duplicateIssue(initialData.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.id) router.push(`/admin/newsletter/issues/${result.id}`);
  }

  async function handleTestSend() {
    if (!testEmail || !initialData.id) return;
    setTestSending(true);
    try {
      const res = await fetch("/api/admin/newsletter/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: initialData.id, email: testEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Test send failed");
      } else {
        toast.success(`Test sent to ${testEmail}`);
      }
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Main column: title, subject, preheader, editor */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Internal title <span className="text-red-500">*</span></Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Week of June 2 — Tuesday motivation"
            disabled={isFinal}
            className="text-base font-semibold"
          />
          <p className="text-xs text-neutral-500">For your eyes only. Subscribers see the subject line below.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subject">Email subject <span className="text-red-500">*</span></Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="The one career question I'd ask in any interview"
            disabled={isFinal}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preheader">Inbox preview</Label>
          <Textarea
            id="preheader"
            value={preheader}
            onChange={(e) => setPreheader(e.target.value)}
            rows={2}
            placeholder="The first line readers see in their inbox before opening."
            disabled={isFinal}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Content <span className="text-red-500">*</span></Label>
          {isFinal ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-500">
              This issue has been sent — content is locked. Use &ldquo;Duplicate&rdquo; to start a new draft from it.
            </div>
          ) : (
            <NewsletterEditor
              initialContent={content}
              onChange={setContent}
              placeholder="Open with a short note from you, then move through the weekly sections…"
            />
          )}
        </div>
      </div>

      {/* Sidebar: status, targeting, schedule, send */}
      <aside className="space-y-5">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <h3 className="font-semibold text-sm text-neutral-900">Status</h3>
          <StatusBadge status={status} />
          {initialData.sentAt && (
            <p className="text-xs text-neutral-500">
              Sent {new Date(initialData.sentAt).toLocaleString()} to {initialData.sentCount} subscribers.
            </p>
          )}
          {isScheduled && initialData.scheduledFor && (
            <p className="text-xs text-neutral-500">
              Scheduled for {new Date(initialData.scheduledFor).toLocaleString()}.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <h3 className="font-semibold text-sm text-neutral-900">Audience</h3>
          <p className="text-xs text-neutral-500">
            {targetInterests.length === 0
              ? "Sending to every active subscriber."
              : `Sending only to subscribers tagged with: ${targetInterests.join(", ")}.`}
          </p>
          <div className="space-y-1.5">
            {NEWSLETTER_INTERESTS.map((interest) => {
              const checked = targetInterests.includes(interest.slug);
              return (
                <label key={interest.slug} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleInterest(interest.slug)}
                    disabled={isFinal}
                    className="h-3.5 w-3.5 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                  />
                  {interest.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <h3 className="font-semibold text-sm text-neutral-900">Featured blog</h3>
          <select
            value={featuredBlogPostId ?? ""}
            onChange={(e) => setFeaturedBlogPostId(e.target.value || null)}
            disabled={isFinal}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— None —</option>
            {blogOptions.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">Used as a hint for the Featured Blog section. Optional.</p>
        </div>

        {!isFinal && (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
            <h3 className="font-semibold text-sm text-neutral-900">Send test to yourself</h3>
            <div className="flex flex-col gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="hello@thryvegrowth.co"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestSend}
                disabled={testSending || !testEmail || mode === "new"}
              >
                {testSending ? "Sending…" : "Send test"}
              </Button>
              {mode === "new" && (
                <p className="text-xs text-neutral-500">Save the draft first, then you can send a test.</p>
              )}
            </div>
          </div>
        )}

        {!isFinal && (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
            <h3 className="font-semibold text-sm text-neutral-900">Schedule</h3>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={isFinal}
            />
            <p className="text-xs text-neutral-500">
              Default: next Tuesday 9 AM ET. Cron checks hourly.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 space-y-2">
          <h3 className="font-semibold text-sm text-brand-900">Actions</h3>

          {!isFinal && (
            <>
              <Button onClick={handleSaveDraft} disabled={saving} variant="outline" className="w-full justify-center">
                {saving ? "Saving…" : "Save draft"}
              </Button>
              {status === "draft" && (
                <Button onClick={handleSubmitForApproval} disabled={saving} variant="outline" className="w-full justify-center">
                  Submit for approval
                </Button>
              )}
              {(status === "draft" || status === "pending_approval") && (
                <Button onClick={handleApproveAndSchedule} disabled={saving} className="w-full justify-center">
                  Approve & schedule
                </Button>
              )}
              {isScheduled && (
                <Button onClick={handleUnschedule} variant="outline" className="w-full justify-center">
                  Revert to draft
                </Button>
              )}
              <Button onClick={handleSendNow} disabled={saving} className="w-full justify-center">
                Send now
              </Button>
            </>
          )}

          {initialData.id && (
            <>
              <a
                href={`/admin/newsletter/issues/${initialData.id}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-brand-800 font-medium underline-offset-4 hover:underline py-1.5"
              >
                Open preview ↗
              </a>
              <Button onClick={handleDuplicate} variant="outline" className="w-full justify-center">
                Duplicate
              </Button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  const styles: Record<IssueStatus, string> = {
    draft: "bg-neutral-100 text-neutral-700",
    pending_approval: "bg-amber-100 text-amber-700",
    scheduled: "bg-blue-100 text-blue-700",
    sending: "bg-purple-100 text-purple-700",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const labels: Record<IssueStatus, string> = {
    draft: "Draft",
    pending_approval: "Pending approval",
    scheduled: "Scheduled",
    sending: "Sending",
    sent: "Sent",
    failed: "Failed",
  };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
