// Daily cron: send milestone thank-you emails to subscribers on the 6-month
// and 1-year anniversary of their signup date.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMilestoneEmail } from "@/lib/email/newsletter-reengagement";

export const runtime = "nodejs";
export const maxDuration = 120;

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
  subscribed_at: string;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();

  const sent = await sendForOffset(supabase, 6 * 30, "6_months");
  const sentYear = await sendForOffset(supabase, 365, "1_year");

  return Response.json({
    sent_6_month: sent.sent,
    errors_6_month: sent.errors,
    sent_1_year: sentYear.sent,
    errors_1_year: sentYear.errors,
  });
}

async function sendForOffset(
  supabase: ReturnType<typeof createServiceClient>,
  days: number,
  milestone: "6_months" | "1_year"
): Promise<{ sent: number; errors: string[] }> {
  // Target a specific subscribed_at date (today minus N days). We use a 24h
  // window since the cron runs daily.
  const target = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const start = new Date(target);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const { data: candidatesRaw, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, first_name, unsubscribe_token, subscribed_at")
    .is("unsubscribed_at", null)
    .gte("subscribed_at", start.toISOString())
    .lt("subscribed_at", end.toISOString());

  if (error) {
    console.error(`[cron/newsletter-milestones] ${milestone} query failed:`, error);
    return { sent: 0, errors: [error.message] };
  }

  const candidates = (candidatesRaw ?? []) as Candidate[];
  let sent = 0;
  const errors: string[] = [];

  for (const sub of candidates) {
    try {
      await sendMilestoneEmail({
        email: sub.email,
        firstName: sub.first_name,
        unsubscribeToken: sub.unsubscribe_token,
        milestone,
      });
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${sub.email}: ${message}`);
    }
  }

  return { sent, errors };
}
