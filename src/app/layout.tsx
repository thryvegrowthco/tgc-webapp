import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
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
  metadataBase: new URL("https://thryvegrowth.co"),
  openGraph: {
    type: "website",
    siteName: "Thryve Growth Co.",
    title: "Thryve Growth Co. | HR Consulting & Career Coaching",
    description:
      "Grow Better Leaders. Build Stronger Teams. Move Careers Forward. Real-world HR expertise meets honest career coaching.",
    images: [{ url: "/images/site/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thryve Growth Co.",
    description: "Clarity. Accountability. Real Growth.",
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
      </body>
    </html>
  );
}
