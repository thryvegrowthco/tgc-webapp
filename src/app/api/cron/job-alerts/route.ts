// Weekly job-alert digest — called by Vercel Cron (see vercel.json)
// Sends each active subscriber a digest of their new matches since last week.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// Protect from unauthorized calls: Vercel sends CRON_SECRET as Bearer token
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev/test: allow all
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

type WatchlistProfile = {
  id: string;
  client_id: string | null;
  subscription_status: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
};

type MatchRow = {
  id: string;
  job_id: string | null;
  rachel_recommended: boolean;
  status: string;
};

type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  is_remote: boolean;
  url: string | null;
  salary_range: string | null;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all active subscriptions
  const { data: watchlistsRaw } = await supabase
    .from("watchlist_profiles")
    .select("id, client_id, subscription_status")
    .eq("subscription_status", "active");

  const watchlists = (watchlistsRaw ?? []) as WatchlistProfile[];

  if (watchlists.length === 0) {
    return Response.json({ sent: 0, message: "No active subscribers" });
  }

  const clientIds = watchlists.map((w) => w.client_id).filter(Boolean) as string[];

  // Fetch profiles (email + name)
  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", clientIds);
  const profiles = (profilesRaw ?? []) as ProfileRow[];
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  // One week ago
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  const errors: string[] = [];

  for (const watchlist of watchlists) {
    if (!watchlist.client_id) continue;
    const profile = profileMap[watchlist.client_id];
    if (!profile?.email) continue;

    // Get new matches for this client in the last week
    const { data: matchesRaw } = await supabase
      .from("client_job_matches")
      .select("id, job_id, rachel_recommended, status")
      .eq("client_id", watchlist.client_id)
      .eq("status", "new")
      .gte("created_at", oneWeekAgo);

    const matches = (matchesRaw ?? []) as MatchRow[];
    if (matches.length === 0) continue;

    const jobIds = matches.map((m) => m.job_id).filter(Boolean) as string[];
    const { data: jobsRaw } = await supabase
      .from("job_listings")
      .select("id, title, company, location, is_remote, url, salary_range")
      .in("id", jobIds);
    const jobs = (jobsRaw ?? []) as JobRow[];
    const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

    // Build plain-text digest (Resend HTML email can be added later)
    const jobLines = matches
      .map((m) => {
        const job = m.job_id ? jobMap[m.job_id] : null;
        if (!job) return null;
        const location = job.is_remote ? "Remote" : (job.location ?? "");
        const recommended = m.rachel_recommended ? " ⭐ Rachel's Pick" : "";
        return `• ${job.title} at ${job.company}${location ? `, ${location}` : ""}${job.salary_range ? ` (${job.salary_range})` : ""}${recommended}${job.url ? `\n  Apply: ${job.url}` : ""}`;
      })
      .filter(Boolean)
      .join("\n\n");

    const emailBody = [
      `Hi ${profile.full_name ?? "there"},`,
      "",
      `You have ${matches.length} new job match${matches.length !== 1 ? "es" : ""} in your Thryve watchlist this week:`,
      "",
      jobLines,
      "",
      "Log in to your dashboard to update your status on each listing:",
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co"}/dashboard/watchlist`,
      "",
      "Rachel, Thryve Growth Co.",
    ].join("\n");

    try {
      const { resend } = await import("@/lib/email/resend");
      await resend.emails.send({
        from: "Rachel at Thryve <noreply@go.thryvegrowth.co>",
        to: profile.email,
        subject: `Your ${matches.length} new job match${matches.length !== 1 ? "es" : ""} this week`,
        text: emailBody,
      });
      sent++;
    } catch (err) {
      errors.push(`Failed for ${profile.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[job-alerts cron] Sent ${sent} digests. Errors: ${errors.length}`);
  if (errors.length > 0) console.error(errors.join("\n"));

  return Response.json({ sent, errors });
}
