"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require";

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  relatedBookingId?: string | null;
  relatedClientId?: string | null;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string | null;
  dueAt?: string | null;
}

function nullOrTrim(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createTask(input: CreateTaskInput): Promise<{ error?: string; success?: boolean; id?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const title = input.title?.trim();
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_tasks")
    .insert({
      title,
      description: nullOrTrim(input.description),
      due_at: input.dueAt || null,
      related_booking_id: input.relatedBookingId ?? null,
      related_client_id: input.relatedClientId ?? null,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create task." };
  revalidatePath("/admin");
  revalidatePath("/admin/tasks");
  if (input.relatedClientId) revalidatePath(`/admin/clients/${input.relatedClientId}`);
  return { success: true, id: data.id };
}

export async function updateTask(input: UpdateTaskInput): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  if (!input.id) return { error: "Task id is required." };

  const supabase = await createClient();
  const update: { title?: string; description?: string | null; due_at?: string | null } = {};
  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (!trimmed) return { error: "Title cannot be empty." };
    update.title = trimmed;
  }
  if (input.description !== undefined) update.description = nullOrTrim(input.description);
  if (input.dueAt !== undefined) update.due_at = input.dueAt || null;

  const { error } = await supabase.from("admin_tasks").update(update).eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/tasks");
  return { success: true };
}

export async function completeTask(id: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/tasks");
  return { success: true };
}

export async function uncompleteTask(id: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_tasks")
    .update({ completed_at: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/tasks");
  return { success: true };
}

export async function deleteTask(id: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase.from("admin_tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/tasks");
  return { success: true };
}
