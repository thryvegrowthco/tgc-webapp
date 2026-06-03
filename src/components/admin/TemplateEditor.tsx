"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, RotateCcw, Eye, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { updateEmailTemplate, resetEmailTemplate } from "@/app/actions/templates";

interface TemplateEditorProps {
  templateKey: string;
  initialSubject: string;
  initialBodyHtml: string;
  placeholders: string[];
  sampleData: Record<string, string>;
  /** The full HTML preview shell, with `__BODY__` token where the body goes. */
  shellTemplate: string;
}

const SHELL_BODY_TOKEN = "__BODY__";

export function TemplateEditor({
  templateKey,
  initialSubject,
  initialBodyHtml,
  placeholders,
  sampleData,
  shellTemplate,
}: TemplateEditorProps) {
  const router = useRouter();
  const [subject, setSubject] = React.useState(initialSubject);
  const [bodyHtml, setBodyHtml] = React.useState(initialBodyHtml);
  const [view, setView] = React.useState<"edit" | "preview">("edit");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const interpolatedSubject = interpolate(subject, sampleData);
  const interpolatedBody = interpolate(bodyHtml, sampleData);
  const previewHtml = shellTemplate.replace(SHELL_BODY_TOKEN, interpolatedBody);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await updateEmailTemplate({ key: templateKey, subject, bodyHtml });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess("Saved.");
    setTimeout(() => setSuccess(null), 2500);
    router.refresh();
  }

  async function handleReset() {
    if (!confirm("Reset this template to its default copy? Your changes will be lost.")) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await resetEmailTemplate(templateKey);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess("Reset to default.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Subject */}
      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject line</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject..."
        />
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <TabButton active={view === "edit"} onClick={() => setView("edit")} icon={<FileCode2 className="h-4 w-4" />}>
          HTML editor
        </TabButton>
        <TabButton active={view === "preview"} onClick={() => setView("preview")} icon={<Eye className="h-4 w-4" />}>
          Preview
        </TabButton>
      </div>

      {view === "edit" ? (
        <div className="space-y-1.5">
          <Label htmlFor="bodyHtml">Body HTML</Label>
          <Textarea
            id="bodyHtml"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            className="min-h-[400px] font-mono text-xs"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-0.5">Subject</p>
            <p className="text-sm font-semibold text-neutral-900">{interpolatedSubject}</p>
          </div>
          <iframe
            srcDoc={previewHtml}
            className="w-full min-h-[600px] rounded-lg border border-neutral-200 bg-white"
            sandbox=""
            title={`Preview of ${templateKey}`}
          />
          <p className="text-xs text-neutral-500">
            Preview rendered with sample data. Placeholders that aren&apos;t supplied will appear blank.
          </p>
        </div>
      )}

      {/* Placeholders reference */}
      {placeholders.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            Available placeholders
          </p>
          <div className="flex flex-wrap gap-1.5">
            {placeholders.map((p) => (
              <code
                key={p}
                className="text-xs bg-white border border-neutral-200 text-neutral-700 px-2 py-1 rounded"
              >
                {`{{${p}}}`}
              </code>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset to default
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-neutral-500 hover:text-neutral-700"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function interpolate(input: string, data: Record<string, string>): string {
  return input.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => data[key] ?? "");
}
