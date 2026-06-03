// Weekly cron: send "we missed you" email to subscribers who haven't opened
// or clicked anything in 60+ days, and haven't already received this email
// recently. Capped per run to stay gentle.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendReengagementEmail } from "@/lib/email/newsletter-reengagement";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_PER_RUN = 50;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

type Candidate = {
  id: string;
  email: string;
  first_name: string | null;
  unsubscribe_token: string;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Eligible: active subscriber, has been sent something at least once,
  // hasn't engaged in 60+ days (or never engaged), last sent at least 7 days ago.
  const { data: candidatesRaw, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, first_name, unsubscribe_token, last_engaged_at")
    .is("unsubscribed_at", null)
    .lt("last_sent_at", sevenDaysAgo)
    .or(`last_engaged_at.is.null,last_engaged_at.lt.${sixtyDaysAgo}`)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("[cron/newsletter-reengage] query failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const candidates = (candidatesRaw ?? []) as Candidate[];
  if (candidates.length === 0) {
    return Response.json({ sent: 0, message: "No re-engagement candidates" });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const sub of candidates) {
    try {
      await sendReengagementEmail({
        email: sub.email,
        firstName: sub.first_name,
        unsubscribeToken: sub.unsubscribe_token,
      });
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${sub.email}: ${message}`);
    }
  }

  console.log(`[cron/newsletter-reengage] sent ${sent}/${candidates.length}, ${errors.length} errors`);
  return Response.json({ sent, total: candidates.length, errors });
}
