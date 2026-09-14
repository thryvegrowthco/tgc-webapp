import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this project dir. Without this,
  // Next.js auto-detects the parent /Users/dietz/Desktop/Apps as root
  // because a sibling project has a pnpm-lock.yaml there — which then
  // can't resolve `tailwindcss` from this project's node_modules.
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ["image/webp", "image/avif"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
  },
  // /card is the URL printed as a QR code on Rachel's business cards
  // (artwork: Desktop/Apps/designs/thryve-growth-co/business-card, outside
  // this repo). Cards already in circulation depend on it, so repoint the
  // destination when needed but never delete the entry. permanent:false
  // (307) keeps browsers from caching it, so a new destination takes effect.
  async redirects() {
    return [
      {
        source: "/card",
        destination:
          "/consultation?utm_source=print&utm_medium=business_card&utm_campaign=rachel_card_2026",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
