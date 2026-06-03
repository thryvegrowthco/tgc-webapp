"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NewsletterEditor } from "@/components/admin/NewsletterEditor";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/app/actions/newsletter";
import type { JSONContent } from "@tiptap/react";

interface InitialData {
  id?: string;
  name: string;
  description: string;
  content: JSONContent;
  is_default: boolean;
}

interface NewsletterTemplateFormProps {
  mode: "new" | "edit";
  initialData: InitialData;
}

export function NewsletterTemplateForm({ mode, initialData }: NewsletterTemplateFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(initialData.name);
  const [description, setDescription] = React.useState(initialData.description);
  const [content, setContent] = React.useState<JSONContent>(initialData.content);
  const [isDefault, setIsDefault] = React.useState(initialData.is_default);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { name, description, content, is_default: isDefault };
      if (mode === "new") {
        const result = await createTemplate(payload);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Template created");
        if (result.id) router.push(`/admin/newsletter/templates/${result.id}`);
      } else {
        const result = await updateTemplate(initialData.id!, payload);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Template saved");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialData.id) return;
    if (!window.confirm("Delete this template?")) return;
    const result = await deleteTemplate(initialData.id);
    if (result?.error) toast.error(result.error);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Weekly Default"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When to reach for this template…"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
        />
        Use as default for new issues
      </label>

      <div className="space-y-1.5">
        <Label>Body</Label>
        <NewsletterEditor
          initialContent={content}
          onChange={setContent}
          placeholder="Section headings + placeholder paragraphs…"
        />
        <p className="text-xs text-neutral-500">
          Tip: use H2 headings for each section so Rachel sees the structure when she opens a new issue.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : mode === "new" ? "Create template" : "Save changes"}
        </Button>
        {mode === "edit" && !initialData.is_default && (
          <Button onClick={handleDelete} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

export const EMPTY_TEMPLATE_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
