import type { Metadata } from "next";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// Server wrapper: reads the `redirect` query param (set by src/proxy.ts when it
// bounces an unauthenticated user off a protected page) and hands a validated,
// same-origin path to the client form. logIn re-validates before trusting it.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <LoginForm redirectTo={safeRedirectPath(redirect)} />;
}
