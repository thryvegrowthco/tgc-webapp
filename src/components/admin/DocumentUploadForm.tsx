"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { uploadDocument } from "@/app/actions/documents";

const CATEGORIES = [
  { value: "", label: "No category" },
  { value: "resume", label: "Resume" },
  { value: "cover_letter", label: "Cover Letter" },
  { value: "notes", label: "Session Notes" },
  { value: "worksheet", label: "Worksheet" },
  { value: "template", label: "Template" },
  { value: "other", label: "Other" },
];

export function DocumentUploadForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("clientId", clientId);

    const result = await uploadDocument(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      formRef.current?.reset();
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="file">File <span className="text-red-500">*</span></Label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
          className="block w-full text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Note (optional)</Label>
          <input
            id="description"
            name="description"
            type="text"
            placeholder="e.g. Updated resume v2"
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Document uploaded successfully.
        </p>
      )}

      <Button type="submit" size="sm" disabled={loading}>
        <Upload className="h-3.5 w-3.5" />
        {loading ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
