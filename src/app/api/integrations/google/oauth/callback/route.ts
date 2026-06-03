// Step 2 of Google Calendar OAuth: Google redirects here with `?code=` after
// the user consents. Verifies the state cookie, exchanges the code for tokens,
// and persists encrypted tokens in admin_integrations.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { persistInitialTokens } from "@/lib/google/calendar";

export const runtime = "nodejs";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const integrationsUrl = new URL("/admin/integrations", request.url);

  if (error) {
    integrationsUrl.searchParams.set("error", error);
    return NextResponse.redirect(integrationsUrl);
  }

  if (!code || !state) {
    integrationsUrl.searchParams.set("error", "missing_params");
    return NextResponse.redirect(integrationsUrl);
  }

  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  if (!cookieState || cookieState !== state) {
    integrationsUrl.searchParams.set("error", "state_mismatch");
    return NextResponse.redirect(integrationsUrl);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    integrationsUrl.searchParams.set("error", "not_signed_in");
    return NextResponse.redirect(integrationsUrl);
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") {
    integrationsUrl.searchParams.set("error", "not_admin");
    return NextResponse.redirect(integrationsUrl);
  }

  try {
    const { email } = await persistInitialTokens({ code, adminUserId: user.id });
    integrationsUrl.searchParams.set("connected", email ?? "1");
  } catch (err) {
    integrationsUrl.searchParams.set("error", "exchange_failed");
    if (err instanceof Error) integrationsUrl.searchParams.set("detail", err.message.slice(0, 200));
  }

  const res = NextResponse.redirect(integrationsUrl);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
