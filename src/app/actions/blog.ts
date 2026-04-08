"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { JSONContent } from "@tiptap/react";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");
  return { supabase, user };
}

export interface BlogPostFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: JSONContent;
  published: boolean;
}

export async function createBlogPost(
  data: BlogPostFormData
): Promise<{ error?: string; id?: string }> {
  let user;
  try {
    ({ user } = await requireAdmin());
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", data.slug)
    .maybeSingle();

  if (existing) return { error: "A post with this slug already exists." };

  const { data: post, error } = await supabase
    .from("blog_posts")
    .insert({
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || null,
      content: data.content,
      published: data.published,
      published_at: data.published ? new Date().toISOString() : null,
      author_id: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/admin/content/${post.id}`);
}

export async function updateBlogPost(
  id: string,
  data: BlogPostFormData
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();

  // Check slug uniqueness (excluding self)
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", data.slug)
    .neq("id", id)
    .maybeSingle();

  if (existing) return { error: "A post with this slug already exists." };

  // Fetch current to preserve published_at
  const { data: current } = await supabase
    .from("blog_posts")
    .select("published, published_at")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("blog_posts")
    .update({
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || null,
      content: data.content,
      published: data.published,
      published_at:
        data.published && !current?.published_at
          ? new Date().toISOString()
          : current?.published_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteBlogPost(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { error: error.message };

  redirect("/admin/content");
}

// Upload a featured image to storage and return the path
export async function uploadFeaturedImage(
  formData: FormData
): Promise<{ error?: string; path?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `blog/${Date.now()}-${safeName}`;

  const supabase = createServiceClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("documents")
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };

  const { data: publicUrlData } = supabase.storage
    .from("documents")
    .getPublicUrl(storagePath);

  return { path: publicUrlData.publicUrl };
}
