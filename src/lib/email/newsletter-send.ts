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

  // 1. Lock the issue: only move scheduled/pending issues into sending.
  //    updated_at doubles as the lock timestamp — the cron reclaims any issue
  //    left 'sending' too long (see api/cron/newsletter-send/route.ts).
  const { data: locked, error: lockError } = await supabase
    .from("newsletter_issues")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", issueId)
    .in("status", ["scheduled", "pending_approval", "draft"])
    .select("id, title, subject, preheader, content, status, target_interests")
    .single();

  if (lockError || !locked) {
    throw new Error(`Cannot lock issue ${issueId} for sending: ${lockError?.message ?? "not found or already sending"}`);
  }

  // Past this point the issue is locked. Anything that escapes would strand it
  // at 'sending' forever: the cron only selects 'scheduled', and the guard
  // above blocks a manual retry too. So always release the lock on the way out.
  //
  // It is released to 'failed', deliberately, not back to 'scheduled'. A throw
  // can happen *after* some batches have already gone out, and an automatic
  // retry would then double-send to those people. 'failed' is visible in the
  // admin UI and makes the cron return 500 (so cron-job.org alerts), which is
  // the safe trade: a human decides whether to resend. Batch-level failures
  // don't reach here at all — the send loop records them and carries on.
  try {
    return await deliverIssue(supabase, issueId, locked as unknown as IssueRow);
  } catch (err) {
    await markIssueFailed(issueId, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

async function deliverIssue(
  supabase: ReturnType<typeof createServiceClient>,
  issueId: string,
  issue: IssueRow
): Promise<SendIssueResult> {
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
    // The caller's catch releases the lock and marks the issue failed.
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
  // Tracked explicitly rather than derived from sentCount: batches can fail out
  // of order, so the delivered recipients are not a prefix of the array.
  const sentSubscriberIds: string[] = [];

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

      // The Resend SDK does NOT throw on an API error — it resolves to
      // { data: null, error } for every non-ok response, and even turns a
      // network failure into an `application_error`. Without these two checks a
      // 401 (bad key), 403 (unverified sending domain), 422, 429 or an outage
      // would be written to the ledger as a clean success for every recipient,
      // and the issue marked 'sent' with failed_count 0.
      const batchError = (result as { error?: { message?: string } | null }).error;
      if (batchError) {
        throw new Error(batchError.message ?? "Resend returned an error with no message");
      }

      const responseData = (result as { data?: { data?: Array<{ id: string }> } }).data?.data ?? [];
      if (responseData.length !== batch.length) {
        throw new Error(
          `Resend acknowledged ${responseData.length} of ${batch.length} messages`
        );
      }

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
      sentSubscriberIds.push(...batch.map((sub) => sub.id));
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
      updated_at: now,
    })
    .eq("id", issueId);

  // Update last_sent_at for each recipient that actually got the email
  if (sentSubscriberIds.length > 0) {
    await supabase
      .from("newsletter_subscribers")
      .update({ last_sent_at: now })
      .in("id", sentSubscriberIds);
  }

  return { issueId, sent: sentCount, failed: failedCount, errors };
}

// Only reached when delivery threw, which means the batch loop never completed
// and no per-recipient tally exists — hence failed_count 0. A run that finishes
// with some batches failing sets the real count itself, in deliverIssue.
async function markIssueFailed(issueId: string, reason: string) {
  const supabase = createServiceClient();
  await supabase
    .from("newsletter_issues")
    .update({
      status: "failed",
      failed_count: 0,
      updated_at: new Date().toISOString(),
    })
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
