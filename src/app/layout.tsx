import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { TrackingPixels } from "@/components/tracking/TrackingPixels";
import { CookieConsent } from "@/components/tracking/CookieConsent";
import { OG_DEFAULTS, SITE_URL } from "@/lib/seo/og";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Thryve Growth Co.",
    default: "Thryve Growth Co. | HR Consulting & Career Coaching",
  },
  description:
    "Grow Better Leaders. Build Stronger Teams. Move Careers Forward. Real-world HR consulting and career coaching grounded in clarity, accountability, and honest guidance.",
  keywords: [
    "HR consulting",
    "career coaching",
    "leadership coaching",
    "interview preparation",
    "resume writing",
    "culture consulting",
    "team development",
    "career strategy",
  ],
  authors: [{ name: "Thryve Growth Co. LLC" }],
  creator: "Thryve Growth Co. LLC",
  // www is the canonical host: the apex 307s to it, so every relative metadata URL
  // resolved here (the preview image above all) would otherwise be fetched through
  // a redirect.
  metadataBase: new URL(SITE_URL),
  openGraph: {
    ...OG_DEFAULTS,
    title: "Thryve Growth Co. | HR Consulting & Career Coaching",
    description:
      "Grow Better Leaders. Build Stronger Teams. Move Careers Forward. Real-world HR expertise meets honest career coaching.",
  },
  // The card type only. A title or description here would win over every page's own
  // openGraph copy on X, Slack and iMessage, which is what used to make every page
  // share as "Thryve Growth Co. / Clarity. Accountability. Real Growth."
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="h-full">
        {children}
        <Toaster position="top-right" richColors />
        <Analytics />
        {/* Tracking pixels render only after the visitor accepts cookies. */}
        <Suspense fallback={null}>
          <TrackingPixels />
        </Suspense>
        <CookieConsent />
      </body>
    </html>
  );
}
