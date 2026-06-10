"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ClientGoalStatus, Database } from "@/types/database";

type ClientGoalUpdate = Database["public"]["Tables"]["client_goals"]["Update"];

// One set of actions serves BOTH audiences:
//   • a client managing their own goals from /dashboard/progress
//   • Rachel managing a client's goals from /admin/clients/[id]
// All go through the SERVER client so RLS does the gating: the `client_goals`
// table has a permissive owner policy (client_id = auth.uid()) plus an admin
// policy (is_admin()), and they OR-compose. We never use the service client here.

const STATUSES: ClientGoalStatus[] = ["active", "in_progress", "completed", "paused"];
const MAX_TITLE = 200;

export interface GoalInput {
  clientId?: string | null; // omit/own → self-serve; another id → admin-on-behalf (RLS enforces)
  title: string;
  detail?: string | null;
  status?: ClientGoalStatus;
  targetDate?: string | null; // YYYY-MM-DD
}

function revalidateFor(clientId: string) {
  revalidatePath("/dashboard/progress");
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function createGoal(input: GoalInput): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };

  const title = (input.title ?? "").trim();
  if (title.length < 2) return { error: "Give the goal a title." };
  if (input.status && !STATUSES.includes(input.status)) return { error: "Invalid status." };

  const clientId = input.clientId || user.id;
  // Acting on someone else's goals requires admin. RLS also enforces this, but a
  // pre-check gives a clean error instead of a raw policy violation.
  if (clientId !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if ((profile as { role: string } | null)?.role !== "admin") {
      return { error: "You can only manage your own goals." };
    }
  }

  const { data, error } = await supabase
    .from("client_goals")
    .insert({
      client_id: clientId,
      title: title.slice(0, MAX_TITLE),
      detail: input.detail?.trim() || null,
      status: input.status ?? "active",
      target_date: input.targetDate || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not add the goal." };

  revalidateFor(clientId);
  return { id: data.id };
}

export interface GoalUpdate {
  title?: string;
  detail?: string | null;
  status?: ClientGoalStatus;
  targetDate?: string | null;
}

export async function updateGoal(id: string, fields: GoalUpdate): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };
  if (fields.status && !STATUSES.includes(fields.status)) return { error: "Invalid status." };
  if (fields.title !== undefined && fields.title.trim().length < 2) return { error: "Give the goal a title." };

  // Read first (RLS restricts to owned-or-admin) so we know which page to revalidate.
  const { data: existing } = await supabase
    .from("client_goals")
    .select("client_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Goal not found." };

  const patch: ClientGoalUpdate = { updated_at: new Date().toISOString() };
  if (fields.title !== undefined) patch.title = fields.title.trim().slice(0, MAX_TITLE);
  if (fields.detail !== undefined) patch.detail = fields.detail?.trim() || null;
  if (fields.status !== undefined) patch.status = fields.status;
  if (fields.targetDate !== undefined) patch.target_date = fields.targetDate || null;

  const { error } = await supabase.from("client_goals").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidateFor((existing as { client_id: string }).client_id);
  return { success: true };
}

export async function deleteGoal(id: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };

  const { data: existing } = await supabase
    .from("client_goals")
    .select("client_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Goal not found." };

  const { error } = await supabase.from("client_goals").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateFor((existing as { client_id: string }).client_id);
  return { success: true };
}
