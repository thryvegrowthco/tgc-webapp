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
};

export default nextConfig;
