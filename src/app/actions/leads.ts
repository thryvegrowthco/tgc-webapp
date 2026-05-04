"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;
type LeadStatus = (typeof ALLOWED_STATUSES)[number];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const p = profile as { role: string } | null;
  if (p?.role !== "admin") redirect("/dashboard");
}

export async function updateLeadStatus(leadId: string, status: string) {
  await requireAdmin();
  if (!(ALLOWED_STATUSES as readonly string[]).includes(status)) return;
  const supabase = createServiceClient();
  await supabase
    .from("leads")
    .update({ status: status as LeadStatus, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function updateLeadAdminNotes(leadId: string, notes: string) {
  await requireAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("leads")
    .update({ admin_notes: notes.slice(0, 4000), updated_at: new Date().toISOString() })
    .eq("id", leadId);
  revalidatePath(`/admin/leads/${leadId}`);
}
