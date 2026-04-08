"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { createBlogPost, updateBlogPost, uploadFeaturedImage } from "@/app/actions/blog";
import type { JSONContent } from "@tiptap/react";

interface BlogPostFormProps {
  mode: "new" | "edit";
  postId?: string;
  initialData?: {
    title: string;
    slug: string;
    excerpt: string;
    content: JSONContent | null;
    published: boolean;
    featuredImagePath: string | null;
  };
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function BlogPostForm({ mode, postId, initialData }: BlogPostFormProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialData?.title ?? "");
  const [slug, setSlug] = React.useState(initialData?.slug ?? "");
  const [excerpt, setExcerpt] = React.useState(initialData?.excerpt ?? "");
  const [content, setContent] = React.useState<JSONContent | null>(initialData?.content ?? null);
  const [published, setPublished] = React.useState(initialData?.published ?? false);
  const [featuredImageUrl, setFeaturedImageUrl] = React.useState<string | null>(
    initialData?.featuredImagePath ?? null
  );
  const [imageUploading, setImageUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Auto-generate slug from title (only in new mode, only if slug hasn't been manually edited)
  const slugAutoRef = React.useRef(mode === "new");
  function handleTitleChange(val: string) {
    setTitle(val);
    if (slugAutoRef.current) setSlug(slugify(val));
  }
  function handleSlugChange(val: string) {
    slugAutoRef.current = false;
    setSlug(val);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadFeaturedImage(fd);
    setImageUploading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.path) {
      setFeaturedImageUrl(result.path);
    }
  }

  async function handleSave(publishState: boolean) {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!slug.trim()) { setError("Slug is required."); return; }
    if (!content) { setError("Add some content before saving."); return; }

    setError(null);
    setSaving(true);
    setPublished(publishState);

    const payload = { title, slug, excerpt, content, published: publishState };

    let result: { error?: string } = {};
    if (mode === "new") {
      // createBlogPost redirects on success — only returns if there's an error
      result = await createBlogPost(payload);
    } else {
      result = await updateBlogPost(postId!, payload);
    }

    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Post saved.
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="How to Actually Prepare for a Behavioral Interview"
          className="text-base font-semibold"
        />
      </div>

      {/* Slug + Excerpt row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="slug">
            Slug <span className="text-red-500">*</span>{" "}
            <span className="text-xs text-neutral-400 font-normal">(URL: /blog/your-slug)</span>
          </Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="how-to-prepare-for-behavioral-interview"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="excerpt">
            Excerpt{" "}
            <span className="text-xs text-neutral-400 font-normal">(shown in blog list)</span>
          </Label>
          <Input
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A short summary of the post…"
          />
        </div>
      </div>

      {/* Featured image */}
      <div className="space-y-1.5">
        <Label>Featured Image <span className="text-xs text-neutral-400 font-normal">(optional)</span></Label>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            className="block text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
          />
          {imageUploading && <span className="text-xs text-neutral-400">Uploading…</span>}
        </div>
        {featuredImageUrl && (
          <div className="mt-2 relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featuredImageUrl}
              alt="Featured"
              className="h-24 rounded-lg object-cover border border-neutral-200"
            />
            <button
              type="button"
              onClick={() => setFeaturedImageUrl(null)}
              className="absolute -top-2 -right-2 bg-white border border-neutral-200 rounded-full w-5 h-5 text-xs text-neutral-500 hover:text-red-500 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="space-y-1.5">
        <Label>Content <span className="text-red-500">*</span></Label>
        <RichTextEditor
          initialContent={initialData?.content ?? null}
          onChange={setContent}
          placeholder="Write your post content here…"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
        <Button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving}
          variant="outline"
        >
          {saving && !published ? "Saving…" : "Save Draft"}
        </Button>
        <Button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
        >
          {saving && published ? "Publishing…" : published ? "Update & Publish" : "Publish"}
        </Button>

        {mode === "edit" && (
          <a
            href={`/blog/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm text-brand-700 hover:text-brand-800 font-medium"
          >
            View post →
          </a>
        )}
      </div>
    </div>
  );
}
