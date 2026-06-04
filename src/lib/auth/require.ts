// Shared admin-gate helpers for server actions and route handlers.
//
// Two shapes for two call patterns:
//
//   • `requireAdmin()` — returns `{ ok: true, userId }` on success, `{ error }` on failure.
//     Use in actions whose return type is `{ error?: string; success?: boolean }`.
//
//   • `requireAdminOrThrow()` — throws on failure, returns `{ supabase, user }` on success.
//     Use in actions that should crash hard (e.g., blog editing flows) or when the
//     caller already wraps in try/catch.
//
// Both run the same two checks: an authenticated user, and `profiles.role === 'admin'`.
// Per-route middleware (src/proxy.ts) covers most cases, but server actions can be
// invoked directly and need their own guard.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type RequireAdminResult = { ok: true; userId: string } | { ok: false; error: string };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if ((profile as { role: string } | null)?.role !== "admin") {
    return { ok: false, error: "Admins only." };
  }
  return { ok: true, userId: user.id };
}

export async function requireAdminOrThrow(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if ((profile as { role: string } | null)?.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { supabase, user };
}
