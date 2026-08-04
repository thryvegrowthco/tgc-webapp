"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateResource, finalizeResourceFile, removeResourceFile, deleteResource } from "@/app/actions/resources";
import { uploadViaSignedUrl } from "@/lib/upload/direct";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Resource, ResourceCtaType } from "@/types/database";

const CATEGORIES = [
  "Career & Job Search",
  "Leadership & Coaching",
  "HR & Team Operations",
];

const CTA_TYPES: ResourceCtaType[] = ["Buy Now", "Download"];

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.png,.jpg,.jpeg";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ResourceEditFormProps {
  resource: Resource;
}

export function ResourceEditForm({ resource }: ResourceEditFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const [enabled, setEnabled] = React.useState(resource.enabled);
  const [title, setTitle] = React.useState(resource.title);
  const [description, setDescription] = React.useState(resource.description);
  const [category, setCategory] = React.useState(resource.category);
  const [price, setPrice] = React.useState(resource.price);
  const [ctaType, setCtaType] = React.useState<ResourceCtaType>(resource.cta_type);
  const [sortOrder, setSortOrder] = React.useState(String(resource.sort_order));
  const [externalUrl, setExternalUrl] = React.useState(resource.external_url ?? "");

  // File state is managed locally so upload/remove reflect immediately without
  // relying on the parent server component re-seeding this client form's state.
  const [fileName, setFileName] = React.useState<string | null>(resource.file_name);
  const [filePath, setFilePath] = React.useState<string | null>(resource.file_path);
  const [fileSize, setFileSize] = React.useState<number | null>(resource.file_size_bytes);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateResource({
        id: resource.id,
        title,
        description,
        category,
        price,
        ctaType,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        enabled,
        externalUrl,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Resource saved.");
      router.refresh();
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Upload straight to Storage (no Server Action body cap), then record it.
      const { path } = await uploadViaSignedUrl("resource-files", file, resource.id);
      const result = await finalizeResourceFile(resource.id, {
        path,
        fileName: file.name,
        sizeBytes: file.size,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setFileName(file.name);
      setFilePath(path);
      setFileSize(file.size);
      toast.success("File uploaded.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveFile() {
    setUploading(true);
    try {
      const result = await removeResourceFile(resource.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setFileName(null);
      setFilePath(null);
      setFileSize(null);
      toast.success("File removed.");
      router.refresh();
    } catch {
      toast.error("Could not remove the file. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteResource(resource.id);
    if (result.error) {
      setDeleting(false);
      setConfirmDelete(false);
      toast.error(result.error);
      return;
    }
    toast.success("Resource deleted.");
    router.push("/admin/resources");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-neutral-200 p-6">
      {/* Enabled toggle */}
      <label className="flex items-start gap-3 rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm">
          <span className="font-medium text-neutral-900">Show on /resources</span>
          <span className="block text-xs text-neutral-500 mt-0.5">
            When off, this resource is hidden from the public page. When on, the card shows with a “Coming soon” badge in place of the Buy/Download button.
          </span>
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="flex h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="price">Price <span className="text-red-500">*</span></Label>
          <Input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Free or $19"
            required
          />
          <p className="text-xs text-neutral-400">Use “Free” or a dollar amount like “$19”.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cta_type">CTA type <span className="text-red-500">*</span></Label>
          <select
            id="cta_type"
            value={ctaType}
            onChange={(e) => setCtaType(e.target.value as ResourceCtaType)}
            className="flex h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {CTA_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-400">Determines the eventual button style.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort_order">Sort order</Label>
          <Input
            id="sort_order"
            type="number"
            step={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <p className="text-xs text-neutral-400">Lower numbers show first.</p>
        </div>
      </div>

      {/* Downloadable file / link — makes free "Download" resources actually work */}
      <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
        <div>
          <p className="text-sm font-medium text-neutral-900">Downloadable file</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Upload the file people download (PDF, Office doc, CSV, ZIP, PNG/JPG — up to 25&nbsp;MB), or set an
            external link below. A hosted file takes priority. Free “Download” resources go live once one is set.
          </p>
        </div>

        {filePath ? (
          <div className="flex items-center justify-between rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-800 truncate">{fileName ?? "Uploaded file"}</p>
              {fileSize != null && <p className="text-xs text-neutral-400">{formatBytes(fileSize)}</p>}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile} disabled={uploading || pending}>
              Remove
            </Button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload file"}
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="external_url">External link (optional)</Label>
          <Input
            id="external_url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://… (Google Doc, Dropbox, etc.)"
          />
          <p className="text-xs text-neutral-400">Used only when no file is uploaded. Saved with the button below.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/resources")} disabled={pending}>
          Back to resources
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          disabled={pending || deleting}
          className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this resource?"
        description="This permanently removes the resource and its uploaded file. This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </form>
  );
}
