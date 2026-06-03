import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { NewsletterIssueForm } from "@/components/admin/NewsletterIssueForm";
import type { JSONContent } from "@tiptap/react";

export const metadata: Metadata = {
  title: "New issue — Newsletter",
  robots: { index: false, follow: false },
};

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export default async function NewIssuePage() {
  const supabase = createServiceClient();

  // Pre-fill from the default template if one exists
  const { data: tplRaw } = await supabase
    .from("newsletter_templates")
    .select("id, content")
    .eq("is_default", true)
    .maybeSingle();
  const tpl = tplRaw as { id: string; content: JSONContent } | null;

  const { data: blogsRaw } = await supabase
    .from("blog_posts")
    .select("id, title")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(50);
  const blogOptions = (blogsRaw ?? []) as Array<{ id: string; title: string }>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/newsletter/issues"
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:text-brand-800 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to issues
        </Link>
        <h1 className="font-display text-2xl font-bold text-neutral-900">New issue</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Pre-filled with the default 7-section template. Edit, save, schedule when you&apos;re ready.
        </p>
      </div>

      <NewsletterIssueForm
        mode="new"
        initialData={{
          title: "",
          subject: "",
          preheader: "",
          content: tpl?.content ?? EMPTY_DOC,
          status: "draft",
          scheduledFor: null,
          targetInterests: [],
          featuredBlogPostId: null,
          templateId: tpl?.id ?? null,
          sentAt: null,
          sentCount: 0,
        }}
        blogOptions={blogOptions}
      />
    </div>
  );
}
