import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FileEdit, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Blog — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminContentPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, published, published_at, created_at, excerpt")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Blog</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {posts?.length ?? 0} post{(posts?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/content/new">
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {!posts || posts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-neutral-400 mb-4">No posts yet. Write your first one.</p>
            <Button asChild size="sm">
              <Link href="/admin/content/new">
                <Plus className="h-4 w-4" /> New Post
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.published ? (
                      <Eye className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-neutral-300 flex-shrink-0" />
                    )}
                    <Link
                      href={`/admin/content/${post.id}`}
                      className="font-medium text-neutral-900 hover:text-brand-700 transition-colors truncate text-sm"
                    >
                      {post.title}
                    </Link>
                  </div>
                  {post.excerpt && (
                    <p className="text-xs text-neutral-400 truncate">{post.excerpt}</p>
                  )}
                  <p className="text-xs text-neutral-300 mt-1">
                    /blog/{post.slug} ·{" "}
                    {post.published && post.published_at
                      ? `Published ${new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : "Draft"}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/admin/content/${post.id}`}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-brand-700 transition-colors"
                  >
                    <FileEdit className="h-3.5 w-3.5" /> Edit
                  </Link>
                  {post.published && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-neutral-400 hover:text-brand-700 transition-colors"
                    >
                      View →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
