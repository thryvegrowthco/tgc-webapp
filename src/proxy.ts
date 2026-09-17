import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

// Auth routes — redirect to dashboard if already logged in
const AUTH_ROUTES = ["/login", "/signup", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh session and get user.
  //
  // updateSession() makes a live network call to Supabase Auth, and it throws
  // rather than returning an error for a missing env var, a lock-acquire
  // timeout, or any non-AuthError. An uncaught throw here is a
  // MIDDLEWARE_INVOCATION_FAILED — a 500 on *every* matched route, before the
  // handler runs. Degrade to "no user" instead: that fails closed (protected
  // routes still redirect to /login below) while public pages keep rendering.
  const { supabaseResponse, user } = await updateSession(request).catch(
    (err) => {
      console.error("[proxy] session refresh failed:", err);
      return { supabaseResponse: NextResponse.next({ request }), user: null };
    }
  );

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Unauthenticated user hitting a protected route → redirect to login
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting an auth route → send them to their landing page
  if (isAuthRoute && user) {
    const supabase = await import("@/lib/supabase/server").then((m) =>
      m.createClient()
    );
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const landing = (profile as { role: string } | null)?.role === "admin"
      ? "/admin"
      : "/dashboard";
    return NextResponse.redirect(new URL(landing, request.url));
  }

  // Admin-only routes — redirect non-admins to dashboard
  if (pathname.startsWith("/admin") && user) {
    const supabase = await import("@/lib/supabase/server").then((m) =>
      m.createClient()
    );
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if ((profile as { role: string } | null)?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/ (route handlers — see below)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets (images, logos, etc.)
     *
     * api/ is excluded deliberately. This middleware only guards /dashboard and
     * /admin *page* navigations; every auth-sensitive route handler calls
     * getUser() itself, so none of them relied on it. Running it on /api meant
     * every request — including each hourly cron tick — paid for a Supabase
     * Auth round-trip that could only ever fail the request, never help it.
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images/|logos/).*)",
  ],
};
