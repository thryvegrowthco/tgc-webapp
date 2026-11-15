// Newsletter send pipeline. Triggered by:
//   1. /api/cron/newsletter-send (hourly) for issues whose scheduled_for has arrived
//   2. The "Send now" action in /admin/newsletter/issues/[id]
//
// Steps for sendIssue(issueId):
//   1. Atomically lock the issue (status='sending')
//   2. Render the HTML body once
//   3. Load matching recipients (active subscribers, interest-filtered) a page
//      at a time and put them in sign-up order, minus anyone the send ledger
//      shows this issue already reached (a run that was killed partway and
//      retried resumes; it does not start over)
//   4. For each batch of 100, call resend.batch.send with per-recipient
//      personalization + signed unsubscribe URL + List-Unsubscribe headers,
//      under an idempotency key so that a batch Resend already accepted is not
//      sent a second time by a retry
//   5. Insert newsletter_sends rows correlating Resend message IDs
//   6. Set issue status to 'sent' (or 'failed' if every batch failed)

import { createHash } from "node:crypto";
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
const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request by default
const STAMP_CHUNK_SIZE = 100; // ids per last_sent_at update: the id list travels in the request URL

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
  subscribed_at: string | null;
}

export interface SendIssueResult {
  issueId: string;
  /** Delivered by this run. */
  sent: number;
  failed: number;
  /** Left out by this run because an earlier, interrupted run already reached them. */
  skipped: number;
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
  // can happen *after* some batches have already gone out. A retry would not
  // reach those people twice (deliverIssue leaves out anyone already in the
  // send ledger), but an error nobody expected should not be retried blindly
  // every hour either. 'failed' is visible in the admin UI and makes the cron
  // return 500 (so cron-job.org alerts): a human decides. Batch-level failures
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
  // 2. Load recipients, in the fixed order the batches are cut from
  const matched = await loadMatchingSubscribers(supabase, issue.target_interests);

  // 2b. Leave out anyone this issue already reached. On a first run the ledger
  //     has nothing for this issue. It does when an earlier run was killed
  //     partway (deploy, timeout, OOM) and the cron's stale-lock reclaim put the
  //     issue back on the schedule: the batches that run completed are recorded,
  //     and sending to them again would deliver the issue twice.
  const delivered = await loadDeliveredSubscriberIds(supabase, issueId);
  const recipients = matched.filter((sub) => !delivered.has(sub.id));
  const skippedIds = matched.filter((sub) => delivered.has(sub.id)).map((sub) => sub.id);

  if (recipients.length === 0) {
    // Nobody matched, or the interrupted run reached everyone and was killed
    // before it could mark the issue sent.
    const now = new Date().toISOString();
    await supabase
      .from("newsletter_issues")
      .update({
        status: "sent",
        sent_at: now,
        sent_count: delivered.size,
        failed_count: 0,
      })
      .eq("id", issueId);
    await stampLastSent(supabase, skippedIds, now);
    return {
      issueId,
      sent: 0,
      failed: 0,
      skipped: skippedIds.length,
      errors: [
        matched.length === 0
          ? "No recipients matched"
          : "Every matching recipient already received this issue",
      ],
    };
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
      // The key makes a repeat of this exact batch harmless: see batchIdempotencyKey.
      const result = await resend.batch.send(payload, {
        idempotencyKey: batchIdempotencyKey(issueId, batch),
      });

      // The Resend SDK does NOT throw on an API error — it resolves to
      // { data: null, error } for every non-ok response, and even turns a
      // network failure into an `application_error`. Without these two checks a
      // 401 (bad key), 403 (unverified sending domain), 422, 429 or an outage
      // would be written to the ledger as a clean success for every recipient,
      // and the issue marked 'sent' with failed_count 0.
      const batchError = (result as { error?: { name?: string; message?: string } | null }).error;
      if (batchError) {
        if (batchError.name === "invalid_idempotent_request") {
          // Resend has this batch's key on record with a different body. The key
          // is unique to this issue and these recipients, so that record is an
          // earlier run of this send, and something in the batch has changed
          // since (the issue was edited, or a recipient's details were). Resend
          // refuses rather than send a second version, and the batch is recorded
          // as failed like any other refusal.
          throw new Error(
            "Resend already received this batch from an earlier run of this send, with different content, and did not send it again"
          );
        }
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
  //    Counts cover the whole issue, so a resumed run adds to what the
  //    interrupted run delivered instead of overwriting it.
  const deliveredTotal = delivered.size + sentCount;
  const allFailed = deliveredTotal === 0 && failedCount > 0;
  const now = new Date().toISOString();
  await supabase
    .from("newsletter_issues")
    .update({
      status: allFailed ? "failed" : "sent",
      sent_at: now,
      sent_count: deliveredTotal,
      failed_count: failedCount,
      updated_at: now,
    })
    .eq("id", issueId);

  // Update last_sent_at for each recipient that actually got the email,
  // including the ones an interrupted run reached before this one resumed.
  await stampLastSent(supabase, [...skippedIds, ...sentSubscriberIds], now);

  return {
    issueId,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedIds.length,
    errors,
  };
}

// Every active subscriber the issue is addressed to, in sign-up order.
//
// Read a page at a time: one request returns at most 1000 rows, so a single
// query would silently leave out everyone past the first thousand. Each page
// starts after the last id of the one before, so a subscribe or unsubscribe
// while the list is being read cannot shift a page boundary and skip someone.
//
// The order matters because batches are cut from this list, and a retried send
// has to cut the same batches as the run it resumes for the idempotency key to
// match (see batchIdempotencyKey). Sign-up order keeps new subscribers at the
// end, where they cannot move the boundary of an earlier batch.
async function loadMatchingSubscribers(
  supabase: ReturnType<typeof createServiceClient>,
  targetInterests: string[] | null
): Promise<SubscriberRow[]> {
  const matched: SubscriberRow[] = [];
  let lastId: string | null = null;
  for (;;) {
    let query = supabase
      .from("newsletter_subscribers")
      .select("id, email, first_name, unsubscribe_token, interests, subscribed_at")
      .is("unsubscribed_at", null);
    if (targetInterests && targetInterests.length > 0) {
      query = query.overlaps("interests", targetInterests);
    }
    if (lastId) {
      query = query.gt("id", lastId);
    }
    const { data, error } = await query.order("id", { ascending: true }).limit(PAGE_SIZE);
    if (error) {
      // The caller's catch releases the lock and marks the issue failed.
      throw new Error(`Failed to load recipients: ${error.message}`);
    }
    const rows = (data ?? []) as SubscriberRow[];
    matched.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    lastId = rows[rows.length - 1].id;
  }
  return matched.sort(bySignUpOrder);
}

function bySignUpOrder(a: SubscriberRow, b: SubscriberRow): number {
  const aTime = signUpTime(a);
  const bTime = signUpTime(b);
  if (aTime !== bTime) return aTime - bTime;
  // Same instant (a bulk import, say): fall back to the id so the order is still fixed.
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function signUpTime(sub: SubscriberRow): number {
  const time = sub.subscribed_at ? Date.parse(sub.subscribed_at) : 0;
  return Number.isNaN(time) ? 0 : time;
}

// One key per batch, and the same key on every attempt at that batch.
//
// Resend keeps a key for 24 hours. A request that repeats a key it has already
// accepted, with the same body, gets the original response back and nothing is
// sent again. That covers the one case the send ledger cannot: a run killed
// after Resend accepted a batch but before its ledger rows were written leaves
// no row behind, so the retry sends that batch again, and only Resend can tell
// it has seen it before. The retry then writes the ledger rows from the
// response it gets back (the original message ids) and carries on.
//
// The key is the issue plus the batch's recipients, in order. A retry cuts the
// same batches as long as it reads the same list: the recipients already in the
// ledger are whole batches, so leaving them out keeps the rest aligned. If one
// of that batch's recipients unsubscribed in between, or someone subscribed
// while the batch in question was the last, part-filled one, the retry cuts a
// different batch with a new key, and the people in both get a second copy.
function batchIdempotencyKey(issueId: string, batch: SubscriberRow[]): string {
  const recipients = createHash("sha256")
    .update(batch.map((sub) => sub.id).join(","))
    .digest("hex");
  return `newsletter-issue/${issueId}/${recipients}`;
}

// Subscribers this issue has already gone out to, according to the send ledger.
// 'failed' rows are left out on purpose, so those subscribers are tried again.
async function loadDeliveredSubscriberIds(
  supabase: ReturnType<typeof createServiceClient>,
  issueId: string
): Promise<Set<string>> {
  const delivered = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("newsletter_sends")
      .select("subscriber_id")
      .eq("issue_id", issueId)
      .neq("status", "failed")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      // Sending without this list could deliver the issue twice, so stop. The
      // caller's catch releases the lock and marks the issue failed.
      throw new Error(`Failed to load the send ledger: ${error.message}`);
    }
    const rows = (data ?? []) as Array<{ subscriber_id: string }>;
    for (const row of rows) delivered.add(row.subscriber_id);
    if (rows.length < PAGE_SIZE) break;
  }
  return delivered;
}

async function stampLastSent(
  supabase: ReturnType<typeof createServiceClient>,
  subscriberIds: string[],
  at: string
) {
  // In chunks: the id list is sent in the request URL, and one request for a
  // whole large list would be too long for it.
  for (let i = 0; i < subscriberIds.length; i += STAMP_CHUNK_SIZE) {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ last_sent_at: at })
      .in("id", subscriberIds.slice(i, i + STAMP_CHUNK_SIZE));
    if (error) {
      console.error("[newsletter-send] failed to stamp last_sent_at:", error);
    }
  }
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
