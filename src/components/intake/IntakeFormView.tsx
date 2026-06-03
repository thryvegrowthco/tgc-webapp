// Read-only display of an intake submission. Reuses the same schemas as the
// renderer so labels and ordering stay in sync. Used in /admin/clients/[id]
// and /admin/sessions/[bookingId] panels.

import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import type { IntakeSchema, IntakeField } from "@/lib/intake/schemas";

interface UploadedFile {
  path: string;
  filename: string;
}

type Responses = Record<string, unknown>;

interface IntakeFormViewProps {
  schema: IntakeSchema;
  responses: Responses;
  submittedAt: string | null;
  /**
   * If provided, file fields will render as links to signed-download URLs at
   * `/api/admin/uploads/sign-download?path=...&name=...`. Phase 5 builds that
   * route; without it the file is shown as a plain filename.
   */
  signedDownloadBase?: string;
}

export function IntakeFormView({ schema, responses, submittedAt, signedDownloadBase }: IntakeFormViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-neutral-900">{schema.title}</h3>
          {schema.subtitle && <p className="text-sm text-neutral-500 mt-0.5">{schema.subtitle}</p>}
        </div>
        {submittedAt && (
          <p className="text-xs text-neutral-500 flex-shrink-0">
            Submitted {new Date(submittedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </div>

      <div className="space-y-5">
        {schema.fields.map((field) => (
          <ReadOnlyField
            key={field.id}
            field={field}
            value={responses[field.id]}
            signedDownloadBase={signedDownloadBase}
          />
        ))}
      </div>
    </div>
  );
}

function ReadOnlyField({
  field,
  value,
  signedDownloadBase,
}: {
  field: IntakeField;
  value: unknown;
  signedDownloadBase?: string;
}) {
  const empty = isEmpty(value);

  return (
    <div className="border-b border-neutral-100 last:border-0 pb-4 last:pb-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
        {field.label}
      </p>
      {empty ? (
        <p className="text-sm text-neutral-400 italic">No response</p>
      ) : (
        renderValue(field, value, signedDownloadBase)
      )}
    </div>
  );
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function renderValue(field: IntakeField, value: unknown, signedDownloadBase?: string) {
  if (field.type === "file") {
    const files: UploadedFile[] = Array.isArray(value)
      ? (value as UploadedFile[]).filter(isUploadedFile)
      : isUploadedFile(value) ? [value as UploadedFile] : [];
    if (files.length === 0) {
      return <p className="text-sm text-neutral-400 italic">No file</p>;
    }
    return (
      <ul className="space-y-1.5">
        {files.map((file) => {
          const inner = (
            <span className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800">
              <FileText className="h-3.5 w-3.5" />
              {file.filename}
              {signedDownloadBase && <ExternalLink className="h-3 w-3" />}
            </span>
          );
          return (
            <li key={file.path}>
              {signedDownloadBase ? (
                <Link
                  href={`${signedDownloadBase}?path=${encodeURIComponent(file.path)}&name=${encodeURIComponent(file.filename)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  prefetch={false}
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  if (field.type === "multiselect") {
    const items = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((opt) => (
          <span key={opt} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
            {opt}
          </span>
        ))}
      </div>
    );
  }

  if (field.type === "long") {
    return (
      <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">{String(value)}</p>
    );
  }

  if (field.type === "url" && typeof value === "string") {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-brand-700 hover:underline break-all"
      >
        {value}
      </a>
    );
  }

  if (field.type === "date" && typeof value === "string") {
    return (
      <p className="text-sm text-neutral-800">
        {new Date(value).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </p>
    );
  }

  return <p className="text-sm text-neutral-800">{String(value)}</p>;
}

function isUploadedFile(value: unknown): value is UploadedFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.path === "string" && typeof v.filename === "string";
}
