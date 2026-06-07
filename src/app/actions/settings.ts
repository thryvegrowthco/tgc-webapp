"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require";
import { bustNotificationSettingsCache } from "@/lib/notifications/settings";

export async function toggleNotificationSetting(
  key: string,
  enabled: boolean
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_settings")
    .update({ enabled, updated_at: new Date().toISOString(), updated_by: auth.userId })
    .eq("key", key);

  if (error) return { error: error.message };

  bustNotificationSettingsCache();
  revalidatePath("/admin/settings");
  return { success: true };
}
