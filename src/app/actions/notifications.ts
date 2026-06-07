"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require";

export async function markNotificationRead(id: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { success: true };
}

// ─── Client-facing notification bell ─────────────────────────────────────────
export async function markClientNotificationRead(id: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("client_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("client_id", user.id)
    .is("read_at", null);

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function markAllClientNotificationsRead(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("client_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", user.id)
    .is("read_at", null);

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
