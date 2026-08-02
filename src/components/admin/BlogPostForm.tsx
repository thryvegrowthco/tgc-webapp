"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { createBlogPost, updateBlogPost } from "@/app/actions/blog";
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
    featuredImageAlt: string | null;
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
  const [featuredImageAlt, setFeaturedImageAlt] = React.useState(
    initialData?.featuredImageAlt ?? ""
  );
  const [mediaOpen, setMediaOpen] = React.useState(false);
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

  async function handleSave(publishState: boolean) {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!slug.trim()) { setError("Slug is required."); return; }
    if (!content) { setError("Add some content before saving."); return; }

    setError(null);
    setSaving(true);
    setPublished(publishState);

    const payload = {
      title,
      slug,
      excerpt,
      content,
      published: publishState,
      featuredImagePath: featuredImageUrl,
      // Don't leave an orphaned alt string behind if the image was removed.
      featuredImageAlt: featuredImageUrl ? featuredImageAlt.trim() || null : null,
    };

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

        {featuredImageUrl ? (
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredImageUrl}
                alt={featuredImageAlt || "Featured image preview"}
                className="h-24 w-40 rounded-lg object-cover border border-neutral-200"
              />
              <button
                type="button"
                onClick={() => {
                  setFeaturedImageUrl(null);
                  setFeaturedImageAlt("");
                }}
                aria-label="Remove featured image"
                className="absolute -top-2 -right-2 bg-white border border-neutral-200 rounded-full w-5 h-5 text-xs text-neutral-500 hover:text-red-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setMediaOpen(true)}>
                <ImagePlus className="h-4 w-4" /> Replace image
              </Button>
              <div className="space-y-1.5">
                <Label htmlFor="featured-alt" className="text-xs font-normal text-neutral-500">
                  Alt text{" "}
                  <span className="text-neutral-400">(describes the image; keep the photo credit)</span>
                </Label>
                <Input
                  id="featured-alt"
                  value={featuredImageAlt}
                  onChange={(e) => setFeaturedImageAlt(e.target.value)}
                  placeholder="Short description of the image"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setMediaOpen(true)}>
              <ImagePlus className="h-4 w-4" /> Choose image
            </Button>
            <p className="text-xs text-neutral-400 mt-1.5">
              Upload your own or search free stock photos on Unsplash. Shown at the top of the post
              and as the preview picture when the post is shared.
            </p>
          </div>
        )}

        <MediaPicker
          open={mediaOpen}
          onOpenChange={setMediaOpen}
          title="Choose a featured image"
          defaultTab="image"
          hideGifTab
          onSelect={({ src, alt }) => {
            setFeaturedImageUrl(src);
            setFeaturedImageAlt(alt);
          }}
        />
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
