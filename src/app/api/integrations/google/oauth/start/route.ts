// Step 1 of Google Calendar OAuth: builds the Google consent URL and
// redirects Rachel there. A state token is signed into a short-lived cookie
// for CSRF protection on the callback.

import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/google/calendar";

export const runtime = "nodejs";

const STATE_COOKIE = "google_oauth_state";
const STATE_TTL_SECONDS = 600; // 10 minutes

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?redirect=/admin/integrations", _request.url));
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", _request.url));
  }

  const state = randomBytes(24).toString("hex");
  const url = buildAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  return res;
}
