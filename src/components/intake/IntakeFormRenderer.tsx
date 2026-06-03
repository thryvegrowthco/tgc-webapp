"use client";

import * as React from "react";
import { CheckCircle2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { saveIntake } from "@/app/actions/intake";
import type { IntakeSchema, IntakeField } from "@/lib/intake/schemas";

interface UploadedFile {
  path: string;
  filename: string;
}

export type IntakeResponses = Record<string, string | string[] | UploadedFile | UploadedFile[] | undefined>;

interface IntakeFormRendererProps {
  schema: IntakeSchema;
  bookingId: string;
  initialResponses: IntakeResponses;
  submittedAt: string | null;
}

export function IntakeFormRenderer({
  schema,
  bookingId,
  initialResponses,
  submittedAt: initialSubmittedAt,
}: IntakeFormRendererProps) {
  const [responses, setResponses] = React.useState<IntakeResponses>(initialResponses);
  const [submittedAt, setSubmittedAt] = React.useState(initialSubmittedAt);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<"idle" | "saving" | "saved">("idle");

  // Debounced auto-save: 1.5s after the last change, save a draft.
  const autoSaveTimer = React.useRef<number | undefined>(undefined);

  function update(fieldId: string, value: IntakeResponses[string]) {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
    if (submittedAt) return; // no auto-save after submission
    setAutoSaveStatus("saving");
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      autoSave({ ...responses, [fieldId]: value });
    }, 1500);
  }

  async function autoSave(snapshot: IntakeResponses) {
    setSaving(true);
    const result = await saveIntake({
      bookingId,
      responses: snapshot as Record<string, unknown>,
      submit: false,
    });
    setSaving(false);
    if (result.error) {
      setAutoSaveStatus("idle");
    } else {
      setAutoSaveStatus("saved");
      window.setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittedAt) return;
    setError(null);
    setSubmitting(true);
    const result = await saveIntake({
      bookingId,
      responses: responses as Record<string, unknown>,
      submit: true,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSubmittedAt(new Date().toISOString());
  }

  if (submittedAt) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-brand-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-brand-800">Intake submitted</p>
            <p className="text-sm text-brand-700 mt-1">
              Thanks — I&apos;ll review everything carefully before we meet. If you need to add
              or change anything, message me from the workspace below.
            </p>
            <p className="text-xs text-brand-600 mt-2">
              Submitted {new Date(submittedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-neutral-900">{schema.title}</h2>
        {schema.subtitle && <p className="text-sm text-neutral-600 mt-1">{schema.subtitle}</p>}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {schema.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={responses[field.id]}
            onChange={(v) => update(field.id, v)}
            bookingId={bookingId}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        <p className="text-xs text-neutral-500">
          {autoSaveStatus === "saving" && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving draft…
            </span>
          )}
          {autoSaveStatus === "saved" && <span className="text-brand-700">Draft saved</span>}
          {autoSaveStatus === "idle" && !saving && "Drafts save automatically as you type."}
        </p>

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit intake"}
        </Button>
      </div>
    </form>
  );
}

interface FieldRendererProps {
  field: IntakeField;
  value: IntakeResponses[string];
  onChange: (value: IntakeResponses[string]) => void;
  bookingId: string;
}

function FieldRenderer({ field, value, onChange, bookingId }: FieldRendererProps) {
  const requiredMark = field.required ? <span className="text-red-500">*</span> : null;

  if (field.type === "short" || field.type === "url") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.id}>{field.label} {requiredMark}</Label>
        {field.help && <p className="text-xs text-neutral-500">{field.help}</p>}
        <Input
          id={field.id}
          type={field.type === "url" ? "url" : "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      </div>
    );
  }

  if (field.type === "long") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.id}>{field.label} {requiredMark}</Label>
        {field.help && <p className="text-xs text-neutral-500">{field.help}</p>}
        <Textarea
          id={field.id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className="min-h-[100px]"
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.id}>{field.label} {requiredMark}</Label>
        {field.help && <p className="text-xs text-neutral-500">{field.help}</p>}
        <select
          id={field.id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={cn(
            "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          )}
        >
          <option value="">Choose one…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-1.5">
        <Label>{field.label} {requiredMark}</Label>
        {field.help && <p className="text-xs text-neutral-500">{field.help}</p>}
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(isSelected ? selected.filter((s) => s !== opt) : [...selected, opt])}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm border transition-colors",
                  isSelected
                    ? "border-brand-500 bg-brand-100 text-brand-800 font-medium"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-brand-200"
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.id}>{field.label} {requiredMark}</Label>
        {field.help && <p className="text-xs text-neutral-500">{field.help}</p>}
        <Input
          id={field.id}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <FileField
        field={field}
        value={value}
        onChange={onChange}
        bookingId={bookingId}
      />
    );
  }

  return null;
}

function FileField({ field, value, onChange, bookingId }: FieldRendererProps) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const files: UploadedFile[] = React.useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return (value as UploadedFile[]).filter((f) => f && typeof f === "object" && "path" in f);
    }
    if (typeof value === "object" && "path" in (value as object)) {
      return [value as UploadedFile];
    }
    return [];
  }, [value]);

  async function handleFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return;
    setUploadError(null);
    setUploading(true);

    const uploaded: UploadedFile[] = [];

    for (const file of Array.from(picked)) {
      try {
        const signRes = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            filename: file.name,
            sizeBytes: file.size,
            fieldId: field.id,
          }),
        });
        const signJson = await signRes.json();
        if (!signRes.ok) {
          setUploadError(signJson.error ?? "Could not start upload.");
          continue;
        }

        const uploadRes = await fetch(signJson.signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!uploadRes.ok) {
          setUploadError("Upload failed. Please try again.");
          continue;
        }

        uploaded.push({ path: signJson.path, filename: file.name });
      } catch {
        setUploadError("Upload failed. Please try again.");
      }
    }

    if (uploaded.length > 0) {
      if (field.multiple) {
        onChange([...files, ...uploaded]);
      } else {
        onChange(uploaded[0]);
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    if (field.multiple) {
      const next = files.filter((_, i) => i !== index);
      onChange(next);
    } else {
      onChange(undefined);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
      {field.help && <p className="text-xs text-neutral-500">{field.help}</p>}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, i) => (
            <li key={file.path} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
              <span className="truncate">{file.filename}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-xs text-neutral-500 hover:text-red-600 ml-2"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className={cn(
        "flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-600",
        "hover:border-brand-300 hover:bg-brand-50 cursor-pointer transition-colors",
        uploading && "opacity-50 cursor-not-allowed"
      )}>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple={field.multiple}
          accept={field.accept?.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {files.length > 0 ? "Add another file" : "Choose file"}
          </>
        )}
      </label>

      {uploadError && (
        <p className="text-xs text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
