import type { Metadata } from "next";

// Auth pages must never be indexed. Set a group-level default so any current or
// future auth page is noindex even if it forgets its own robots directive
// (robots.ts also disallows these paths).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
