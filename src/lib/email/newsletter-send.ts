// Newsletter send pipeline. Triggered by:
//   1. /api/cron/newsletter-send (hourly) for issues whose scheduled_for has arrived
//   2. The "Send now" action in /admin/newsletter/issues/[id]
//
// Steps for sendIssue(issueId):
//   1. Atomically lock the issue (status='sending')
//   2. Render the HTML body once
//   3. Load matching recipients (active subscribers, interest-filtered)
//   4. For each batch of 100, call resend.batch.send with per-recipient
//      personalization + signed unsubscribe URL + List-Unsubscribe headers
//   5. Insert newsletter_sends rows correlating Resend message IDs
//   6. Set issue status to 'sent' (or 'failed' if every batch failed)

import { resend, FROM_EMAIL, REPLY_TO_EMAIL } from "./resend";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildManageUrl,
  buildUnsubscribeApiUrl,
  buildUnsubscribeUrl,
  newsletterBusinessAddress,
  newsletterPublicUrl,
  renderIssueHTML,
  renderIssueText,
} from "./newsletter-render";
import type { JSONContent } from "@tiptap/react";

const BATCH_SIZE = 100;
const BETWEEN_BATCH_MS = 1100; // stays under Resend's default 10 req/s

interface IssueRow {
  id: string;
  title: string;
  subject: string;
  preheader: string;
  content: JSONContent;
  status: string;
  target_interests: string[];
}

interface SubscriberRow {
  id: string;
  email: string;
  first_name: string | null;
  unsubscribe_token: string;
  interests: string[];
}

export interface SendIssueResult {
  issueId: string;
  sent: number;
  failed: number;
  errors: string[];
}

export async function sendIssue(issueId: string): Promise<SendIssueResult> {
  const supabase = createServiceClient();

  // 1. Lock the issue: only move scheduled/pending issues into sending
  const { data: locked, error: lockError } = await supabase
    .from("newsletter_issues")
    .update({ status: "sending" })
    .eq("id", issueId)
    .in("status", ["scheduled", "pending_approval", "draft"])
    .select("id, title, subject, preheader, content, status, target_interests")
    .single();

  if (lockError || !locked) {
    throw new Error(`Cannot lock issue ${issueId} for sending: ${lockError?.message ?? "not found or already sending"}`);
  }
  const issue = locked as unknown as IssueRow;

  // 2. Load recipients
  let recipientQuery = supabase
    .from("newsletter_subscribers")
    .select("id, email, first_name, unsubscribe_token, interests")
    .is("unsubscribed_at", null);

  if (issue.target_interests && issue.target_interests.length > 0) {
    recipientQuery = recipientQuery.overlaps("interests", issue.target_interests);
  }

  const { data: recipientsRaw, error: recipientsError } = await recipientQuery;
  if (recipientsError) {
    await markIssueFailed(issueId, recipientsError.message);
    throw new Error(`Failed to load recipients: ${recipientsError.message}`);
  }
  const recipients = (recipientsRaw ?? []) as SubscriberRow[];

  if (recipients.length === 0) {
    await supabase
      .from("newsletter_issues")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: 0,
        failed_count: 0,
      })
      .eq("id", issueId);
    return { issueId, sent: 0, failed: 0, errors: ["No recipients matched"] };
  }

  // 3. Render HTML once (placeholders for first_name / unsubscribe_url / manage_url)
  const baseHtml = renderIssueHTML({
    subject: issue.subject,
    preheader: issue.preheader,
    content: issue.content,
    publicUrl: newsletterPublicUrl(),
    businessAddress: newsletterBusinessAddress(),
  });
  const baseText = renderIssueText({
    subject: issue.subject,
    preheader: issue.preheader,
    content: issue.content,
  });

  // 4. Send in batches
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const payload = batch.map((sub) => {
      const unsubscribeUrl = buildUnsubscribeUrl(sub.unsubscribe_token);
      const unsubscribeApiUrl = buildUnsubscribeApiUrl(sub.unsubscribe_token);
      const manageUrl = buildManageUrl(sub.unsubscribe_token);
      const personalized = personalize(baseHtml, {
        first_name: sub.first_name?.trim() || "there",
        unsubscribe_url: unsubscribeUrl,
        manage_url: manageUrl,
      });
      const personalizedText = personalize(baseText, {
        first_name: sub.first_name?.trim() || "there",
        unsubscribe_url: unsubscribeUrl,
        manage_url: manageUrl,
      });

      return {
        from: FROM_EMAIL,
        to: sub.email,
        replyTo: REPLY_TO_EMAIL,
        subject: issue.subject,
        html: personalized,
        text: personalizedText,
        headers: {
          "List-Unsubscribe": `<mailto:hello@thryvegrowth.co?subject=unsubscribe>, <${unsubscribeApiUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });

    try {
      const result = await resend.batch.send(payload);
      const responseData = (result as { data?: { data?: Array<{ id: string }> } }).data?.data ?? [];

      const sendRows = batch.map((sub, idx) => ({
        issue_id: issueId,
        subscriber_id: sub.id,
        resend_message_id: responseData[idx]?.id ?? null,
        status: "sent" as const,
      }));

      const { error: insertError } = await supabase.from("newsletter_sends").insert(sendRows);
      if (insertError) {
        console.error("[newsletter-send] failed to insert send ledger:", insertError);
      }

      sentCount += batch.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failedCount += batch.length;
      errors.push(`Batch ${i / BATCH_SIZE}: ${message}`);

      const sendRows = batch.map((sub) => ({
        issue_id: issueId,
        subscriber_id: sub.id,
        resend_message_id: null,
        status: "failed" as const,
        error: message.slice(0, 500),
      }));
      await supabase.from("newsletter_sends").insert(sendRows);
    }

    // Throttle between batches
    if (i + BATCH_SIZE < recipients.length) {
      await sleep(BETWEEN_BATCH_MS);
    }
  }

  // 5. Update issue status
  const allFailed = sentCount === 0 && failedCount > 0;
  const now = new Date().toISOString();
  await supabase
    .from("newsletter_issues")
    .update({
      status: allFailed ? "failed" : "sent",
      sent_at: now,
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq("id", issueId);

  // Update last_sent_at for each recipient that got the email
  if (sentCount > 0) {
    const sentSubscriberIds = recipients
      .slice(0, sentCount)
      .map((s) => s.id);
    if (sentSubscriberIds.length > 0) {
      await supabase
        .from("newsletter_subscribers")
        .update({ last_sent_at: now })
        .in("id", sentSubscriberIds);
    }
  }

  return { issueId, sent: sentCount, failed: failedCount, errors };
}

async function markIssueFailed(issueId: string, reason: string) {
  const supabase = createServiceClient();
  await supabase
    .from("newsletter_issues")
    .update({ status: "failed", failed_count: 0 })
    .eq("id", issueId);
  console.error(`[newsletter-send] issue ${issueId} failed:`, reason);
}

function personalize(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(escapeForHtml(value));
  }
  return out;
}

function escapeForHtml(value: string): string {
  // Only minimally escape — the values we inject are URLs and first names.
  // Real HTML escaping of names is handled at insertion time elsewhere; here
  // we just prevent literal `</` from breaking out of attribute contexts.
  return value.replace(/[<>"]/g, (ch) => {
    switch (ch) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default:  return ch;
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
