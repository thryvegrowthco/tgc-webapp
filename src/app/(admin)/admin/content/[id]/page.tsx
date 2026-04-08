import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { DeletePostButton } from "@/components/admin/DeletePostButton";
import type { JSONContent } from "@tiptap/react";

export const metadata: Metadata = {
  title: "Edit Post — Admin",
  robots: { index: false, follow: false },
};

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, published, published_at, featured_image_path")
    .eq("id", id)
    .single();

  if (!post) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/content"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All Posts
        </Link>

        <DeletePostButton postId={id} postTitle={post.title} />
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Edit Post</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            post.published ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
          }`}>
            {post.published ? "Published" : "Draft"}
          </span>
          {post.published && post.published_at && (
            <span className="text-xs text-neutral-400">
              {new Date(post.published_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <BlogPostForm
          mode="edit"
          postId={id}
          initialData={{
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt ?? "",
            content: post.content as JSONContent | null,
            published: post.published,
            featuredImagePath: post.featured_image_path,
          }}
        />
      </div>
    </div>
  );
}
