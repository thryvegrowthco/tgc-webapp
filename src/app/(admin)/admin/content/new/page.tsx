import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { BlogPostForm } from "@/components/admin/BlogPostForm";

export const metadata: Metadata = {
  title: "New Post — Admin",
  robots: { index: false, follow: false },
};

export default function NewBlogPostPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: "Blog", href: "/admin/content" },
        { label: "New Post" },
      ]} />

      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">New Post</h1>
        <p className="text-sm text-neutral-500 mt-1">Write, format, and publish a blog post.</p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <BlogPostForm mode="new" />
      </div>
    </div>
  );
}
