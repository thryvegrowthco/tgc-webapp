import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationStatus } from "@/lib/google/calendar";
import { Button } from "@/components/ui/button";
import { DisconnectGoogleButton } from "@/components/admin/DisconnectGoogleButton";
import { TrackingPixelCard } from "@/components/admin/TrackingPixelCard";
import { JobSourceCard } from "@/components/admin/JobSourceCard";
import type { TrackingPixel, JobSourceRow } from "@/types/database";

export const metadata: Metadata = {
  title: "Integrations — Admin",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "Security check failed. Try again.",
  missing_params: "Google didn't return the expected parameters. Try again.",
  not_signed_in: "You were signed out during the OAuth flow. Sign in and try again.",
  not_admin: "Only admins can connect integrations.",
  exchange_failed: "Couldn't exchange the authorization code for tokens. Check your Google OAuth credentials.",
  access_denied: "You denied access. Try again if you'd like to connect.",
};

export default async function AdminIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; detail?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/integrations");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  const { connected, error, detail } = await searchParams;
  const status = await getIntegrationStatus().catch(() => ({ connected: false, accountEmail: null, connectedAt: null }));

  const { data: pixelsRaw } = await supabase
    .from("tracking_pixels")
    .select("id, provider, name, description, id_placeholder, pixel_id, enabled, sort_order, updated_at, updated_by, created_at")
    .order("sort_order", { ascending: true });
  const pixels = (pixelsRaw ?? []) as TrackingPixel[];
  const liveCount = pixels.filter((p) => p.enabled && p.pixel_id && p.pixel_id.length > 0).length;

  const { data: sourcesRaw } = await supabase
    .from("job_sources")
    .select("*")
    .order("sort_order", { ascending: true });
  const jobSources = (sourcesRaw ?? []) as JobSourceRow[];

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Integrations</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Connect your accounts so the system can do more for you automatically.
        </p>
      </div>

      {connected && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 mb-6 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Connected{connected !== "1" ? ` as ${connected}` : ""}.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6 text-sm text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{ERROR_MESSAGES[error] ?? "Something went wrong."}</p>
            {detail && <p className="text-xs mt-1 text-red-700">{detail}</p>}
          </div>
        </div>
      )}

      <section className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-brand-50 rounded-lg flex-shrink-0">
            <Calendar className="h-5 w-5 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-neutral-900">Google Calendar</h2>
            <p className="text-sm text-neutral-500 mt-1">
              When connected, paid bookings automatically create a calendar event with a Google Meet
              link and invite the client. Without it, you&apos;ll need to send meeting links manually.
            </p>

            {status.connected ? (
              <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm flex items-center gap-2 text-green-700 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Connected
                  </p>
                  {status.accountEmail && (
                    <p className="text-xs text-neutral-500 mt-0.5">as {status.accountEmail}</p>
                  )}
                  {status.connectedAt && (
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Connected {new Date(status.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
                <DisconnectGoogleButton />
              </div>
            ) : (
              <div className="mt-5">
                <Button asChild>
                  <a href="/api/integrations/google/oauth/start">Connect Google Calendar</a>
                </Button>
                <p className="text-xs text-neutral-500 mt-2">
                  You&apos;ll grant access to read/write calendar events on the primary calendar of the
                  connected account.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <p className="text-xs text-neutral-500 mt-6">
        Required env vars: <code className="bg-neutral-100 px-1 rounded">GOOGLE_OAUTH_CLIENT_ID</code>,{" "}
        <code className="bg-neutral-100 px-1 rounded">GOOGLE_OAUTH_CLIENT_SECRET</code>,{" "}
        <code className="bg-neutral-100 px-1 rounded">GOOGLE_OAUTH_REDIRECT_URI</code>, and{" "}
        <code className="bg-neutral-100 px-1 rounded">INTEGRATIONS_ENCRYPTION_KEY</code>.
      </p>

      {/* Visitor tracking */}
      <div className="mt-12">
        <div className="mb-5">
          <h2 className="font-display text-xl font-bold text-neutral-900">Visitor Tracking</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Paste a tracking ID into any card and toggle it on. Scripts only fire after a visitor accepts the cookie consent banner on the public site — anyone who declines never sees a tracker.
          </p>
          {pixels.length > 0 && (
            <p className="text-xs text-neutral-400 mt-2">
              {liveCount === 0
                ? "Nothing live yet — the /privacy page still reads “no third-party tracking.”"
                : `${liveCount} ${liveCount === 1 ? "pixel is" : "pixels are"} currently live on the public site.`}
            </p>
          )}
        </div>

        {pixels.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 px-6 py-12 text-center text-sm text-neutral-500">
            No tracking pixels configured. Apply the 0015_tracking_pixels migration to seed the six supported providers.
          </div>
        ) : (
          <div className="space-y-3">
            {pixels.map((p) => (
              <TrackingPixelCard key={p.id} pixel={p} />
            ))}
          </div>
        )}
      </div>

      {/* Automated job sources */}
      <div className="mt-12">
        <div className="mb-5">
          <h2 className="font-display text-xl font-bold text-neutral-900">Automated Job Sources</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Toggle which boards the weekly automated feed pulls from. Each enabled source is searched
            against every active client&apos;s watchlist, then scored and assigned automatically.
          </p>
        </div>

        {jobSources.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 px-6 py-12 text-center text-sm text-neutral-500">
            No job sources configured. Apply the 0019_job_sources migration to seed JSearch and USAJOBS.
          </div>
        ) : (
          <div className="space-y-3">
            {jobSources.map((s) => (
              <JobSourceCard key={s.id} source={s} />
            ))}
          </div>
        )}

        <p className="text-xs text-neutral-500 mt-4">
          USAJOBS requires <code className="bg-neutral-100 px-1 rounded">USAJOBS_API_KEY</code> and{" "}
          <code className="bg-neutral-100 px-1 rounded">USAJOBS_USER_AGENT</code>. JSearch requires{" "}
          <code className="bg-neutral-100 px-1 rounded">RAPIDAPI_KEY</code>. The feed runs via{" "}
          <code className="bg-neutral-100 px-1 rounded">/api/cron/job-feed</code>.
        </p>
      </div>
    </div>
  );
}
