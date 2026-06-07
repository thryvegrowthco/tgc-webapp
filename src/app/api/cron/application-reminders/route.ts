// Application reminders — nudges clients to update their tracker 7, 14, and 30
// days after they marked a job "applied". Called daily by cron-job.org / Vercel
// Cron. Idempotent per (match, milestone) via automation_log pre-checks.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorized, getNowFromRequest } from "@/lib/cron/auth";
import { sendTemplated } from "@/lib/email/render";
import { createClientNotification } from "@/lib/notifications/client";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
const MILESTONES = [7, 14, 30];

type MatchRow = {
  id: string;
  client_id: string | null;
  job_id: string | null;
  application_date: string | null;
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const supabase = createServiceClient();
  const now = getNowFromRequest(request);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const milestone of MILESTONES) {
    const target = ymd(new Date(now.getTime() - milestone * 86400000));

    const { data: matchesRaw } = await supabase
      .from("client_job_matches")
      .select("id, client_id, job_id, application_date")
      .eq("status", "applied")
      .eq("application_date", target);
    const matches = (matchesRaw ?? []) as MatchRow[];

    for (const match of matches) {
      if (!match.client_id || !match.job_id) continue;
      const eventKey = `application_reminder:${match.id}:${milestone}`;

      // Idempotency pre-check (automation_log dedupe can't key on null booking_id).
      const { data: already } = await supabase
        .from("automation_log")
        .select("id")
        .eq("event_key", eventKey)
        .eq("status", "success")
        .maybeSingle();
      if (already) {
        skipped++;
        continue;
      }

      const [{ data: jobData }, { data: profileData }] = await Promise.all([
        supabase.from("job_listings").select("title, company").eq("id", match.job_id).single(),
        supabase.from("profiles").select("full_name, email").eq("id", match.client_id).single(),
      ]);
      const job = jobData as { title: string; company: string } | null;
      const profile = profileData as { full_name: string | null; email: string } | null;
      if (!job) continue;

      try {
        await createClientNotification({
          clientId: match.client_id,
          type: "application_reminder",
          title: `Any update on ${job.title}?`,
          body: `It's been ${milestone} days since you applied at ${job.company}.`,
          link: "/dashboard/applications",
          matchId: match.id,
        });

        if (profile?.email) {
          await sendTemplated("application_reminder", {
            to: profile.email,
            clientId: match.client_id,
            eventKey,
            data: {
              client_name: profile.full_name || profile.email.split("@")[0],
              job_title: job.title,
              company: job.company,
              applied_date: new Date(`${match.application_date}T00:00:00`).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              dashboard_url: `${APP_URL}/dashboard/applications`,
            },
          });
        } else {
          // No email — still record the milestone so the in-app note isn't duplicated.
          await supabase.from("automation_log").insert({ event_key: eventKey, status: "success", payload: { milestone } });
        }
        sent++;
      } catch (err) {
        errors.push(`${match.id}@${milestone}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  const summary = { sent, skipped, errors: errors.length };
  console.log("[application-reminders cron]", JSON.stringify(summary));
  if (errors.length > 0) console.error(errors.join("\n"));
  return Response.json(summary);
}
