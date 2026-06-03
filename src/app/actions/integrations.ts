"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { disconnectIntegration } from "@/lib/google/calendar";

export async function disconnectGoogleCalendar(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") return { error: "Unauthorized" };

  await disconnectIntegration();
  revalidatePath("/admin/integrations");
  return { success: true };
}
