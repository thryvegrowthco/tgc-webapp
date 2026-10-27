import type { NextConfig } from "next";

// Derive the Supabase origin for connect-src from the public URL at config time.
// Falls back to a wildcard if the env var is unset (e.g. during a bare build).
let supabaseHttp = "https://*.supabase.co";
let supabaseWs = "wss://*.supabase.co";
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    supabaseHttp = u.origin; // e.g. https://abc.supabase.co
    supabaseWs = `wss://${u.host}`; // e.g. wss://abc.supabase.co
  } catch {
    // keep the wildcard fallback
  }
}

// Report-only CSP. It never blocks anything — browsers just POST violations (or
// log them in the console). ENFORCE (switch to Content-Security-Policy) only
// after about a week of clean reports, since tightening it can break third-party
// scripts/pixels. Script + connect hosts mirror src/lib/tracking/scripts.tsx
// (GA4/GTM/Google Ads, Meta Pixel, LinkedIn Insight, Microsoft Clarity) plus
// Vercel Analytics and Supabase.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://snap.licdn.com https://www.clarity.ms https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseHttp} ${supabaseWs} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.clarity.ms https://www.facebook.com https://px.ads.linkedin.com https://vitals.vercel-insights.com`,
  "frame-src 'self' https://www.googletagmanager.com",
  "frame-ancestors 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this project dir. Without this,
  // Next.js auto-detects the parent /Users/dietz/Desktop/Apps as root
  // because a sibling project has a pnpm-lock.yaml there — which then
  // can't resolve `tailwindcss` from this project's node_modules.
  turbopack: {
    root: __dirname,
  },
  poweredByHeader: false,
  images: {
    formats: ["image/webp", "image/avif"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // 2 years. No `preload` — that is a separate owner decision.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          // SAMEORIGIN (not DENY): admin pages iframe same-origin previews
          // (TemplateEditor + newsletter issue preview).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
    ];
  },
};

export default nextConfig;
