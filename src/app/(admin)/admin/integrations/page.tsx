import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationStatus } from "@/lib/google/calendar";
import { Button } from "@/components/ui/button";
import { DisconnectGoogleButton } from "@/components/admin/DisconnectGoogleButton";

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
    </div>
  );
}
