import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { NewsletterTemplateForm } from "@/components/admin/NewsletterTemplateForm";
import type { JSONContent } from "@tiptap/react";

export const metadata: Metadata = {
  title: "Edit template — Newsletter",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  content: JSONContent;
  is_default: boolean;
};

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: rawRow } = await supabase
    .from("newsletter_templates")
    .select("id, name, description, content, is_default")
    .eq("id", id)
    .single();

  if (!rawRow) notFound();
  const row = rawRow as unknown as TemplateRow;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/newsletter/templates"
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:text-brand-800 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to templates
        </Link>
        <h1 className="font-display text-2xl font-bold text-neutral-900">{row.name}</h1>
      </div>

      <NewsletterTemplateForm
        mode="edit"
        initialData={{
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          content: row.content,
          is_default: row.is_default,
        }}
      />
    </div>
  );
}
