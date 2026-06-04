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
