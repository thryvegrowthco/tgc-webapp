import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  NewsletterTemplateForm,
  EMPTY_TEMPLATE_DOC,
} from "@/components/admin/NewsletterTemplateForm";

export const metadata: Metadata = {
  title: "New template — Newsletter",
  robots: { index: false, follow: false },
};

export default function NewTemplatePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/newsletter/templates"
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:text-brand-800 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to templates
        </Link>
        <h1 className="font-display text-2xl font-bold text-neutral-900">New template</h1>
      </div>

      <NewsletterTemplateForm
        mode="new"
        initialData={{
          name: "",
          description: "",
          content: EMPTY_TEMPLATE_DOC,
          is_default: false,
        }}
      />
    </div>
  );
}
