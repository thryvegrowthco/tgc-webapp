"use client";

// Shared media picker for the blog + newsletter Tiptap editors and the blog
// post's featured image. Four ways to add an image: upload a file (→ public
// blog-images bucket), search free GIFs (Giphy), search free stock photos
// (Unsplash), or paste a URL. Returns { src, alt } which the caller drops into
// the editor via setImage() or stores as the post's cover. Search tabs degrade
// gracefully when the provider API key isn't configured.
//
// The title/defaultTab/hideGifTab props are optional and default to the original
// editor behavior, so existing call sites need no changes.

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Upload, Search, Loader2, Link2, Image as ImageIcon, Film, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trackUnsplashDownload } from "@/app/actions/media";
import { uploadViaSignedUrl } from "@/lib/upload/direct";

export interface PickedMedia {
  src: string;
  alt: string;
}

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: PickedMedia) => void;
  /** Dialog heading. Defaults to "Insert image or GIF". */
  title?: string;
  /** Which tab opens first. Defaults to "upload". */
  defaultTab?: Tab;
  /** Hide the GIF tab — e.g. featured images, where a GIF is a poor OG image. */
  hideGifTab?: boolean;
}

type Tab = "upload" | "gif" | "image" | "url";

type GifItem = { id: string; src: string; thumb: string; alt: string };
type ImageItem = {
  id: string;
  src: string;
  thumb: string;
  alt: string;
  creditName: string;
  creditLink: string;
  downloadLocation: string;
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  title = "Insert image or GIF",
  defaultTab = "upload",
  hideGifTab = false,
}: MediaPickerProps) {
  const [tab, setTab] = React.useState<Tab>(defaultTab);

  function choose(media: PickedMedia) {
    if (!media.src) return;
    onSelect(media);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-xl shadow-xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex items-center justify-between px-5 pt-5">
            <Dialog.Title className="font-display font-bold text-neutral-900 text-lg">
              {title}
            </Dialog.Title>
            <Dialog.Close className="text-neutral-400 hover:text-neutral-700 rounded p-1" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            {hideGifTab
              ? "Upload a file, search free stock photos, or paste an image URL."
              : "Upload a file, search free GIFs or stock photos, or paste an image URL."}
          </Dialog.Description>

          {/* Tabs */}
          <div className="flex gap-1 px-5 pt-4 border-b border-neutral-100">
            <TabButton active={tab === "upload"} onClick={() => setTab("upload")} icon={Upload} label="Upload" />
            {!hideGifTab && (
              <TabButton active={tab === "gif"} onClick={() => setTab("gif")} icon={Film} label="GIFs" />
            )}
            <TabButton active={tab === "image"} onClick={() => setTab("image")} icon={ImageIcon} label="Photos" />
            <TabButton active={tab === "url"} onClick={() => setTab("url")} icon={Link2} label="URL" />
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === "upload" && <UploadTab onPick={choose} />}
            {tab === "gif" && !hideGifTab && <GifTab active={open && tab === "gif"} onPick={choose} />}
            {tab === "image" && <ImageTab active={open && tab === "image"} onPick={choose} />}
            {tab === "url" && <UrlTab onPick={choose} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-neutral-500 hover:text-neutral-800"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ── Upload ──────────────────────────────────────────────────────────────────
function UploadTab({ onPick }: { onPick: (m: PickedMedia) => void }) {
  const [uploading, setUploading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { publicUrl } = await uploadViaSignedUrl("blog-images", file, "inline");
      if (!publicUrl) throw new Error("Upload succeeded but no URL was returned.");
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      onPick({ src: publicUrl, alt });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-14 cursor-pointer transition-colors",
          dragging ? "border-brand-400 bg-brand-50" : "border-neutral-300 hover:border-brand-300 hover:bg-neutral-50"
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-7 w-7 text-brand-600 animate-spin" />
            <p className="text-sm text-neutral-600">Uploading…</p>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7 text-neutral-400" />
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-brand-700">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-neutral-400">JPG, PNG, WebP, or GIF · up to 10 MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

// ── Shared search grid state ──────────────────────────────────────────────────
function useMediaSearch<T>(active: boolean, endpoint: string) {
  const [query, setQuery] = React.useState("");
  const debounced = useDebounced(query, 350);
  const [items, setItems] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const reqRef = React.useRef(0);

  React.useEffect(() => {
    if (!active) return;
    const id = ++reqRef.current;
    setLoading(true);
    fetch(`${endpoint}?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((json: { configured?: boolean; items?: T[] }) => {
        if (id !== reqRef.current) return; // stale
        setConfigured(json.configured ?? true);
        setItems(json.items ?? []);
      })
      .catch(() => {
        if (id !== reqRef.current) return;
        setItems([]);
      })
      .finally(() => {
        if (id === reqRef.current) setLoading(false);
      });
  }, [active, debounced, endpoint]);

  return { query, setQuery, items, loading, configured };
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

function NotConfigured({ what, envVar }: { what: string; envVar: string }) {
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
      {what} search isn&apos;t set up yet. Add a free <code className="text-xs bg-amber-100 px-1 rounded">{envVar}</code>{" "}
      to enable it. You can still upload a file or paste a URL in the other tabs.
    </div>
  );
}

// ── GIFs (Giphy) ──────────────────────────────────────────────────────────────
function GifTab({ active, onPick }: { active: boolean; onPick: (m: PickedMedia) => void }) {
  const { query, setQuery, items, loading, configured } = useMediaSearch<GifItem>(active, "/api/media/gif");

  if (configured === false) return <NotConfigured what="GIF" envVar="GIPHY_API_KEY" />;

  return (
    <div>
      <SearchBox value={query} onChange={setQuery} placeholder="Search GIFs (e.g. celebrate, high five)…" />
      {loading && items.length === 0 ? (
        <GridSpinner />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onPick({ src: g.src, alt: g.alt })}
              className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 hover:ring-2 hover:ring-brand-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.thumb} alt={g.alt} className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-neutral-400 text-right">Powered by GIPHY</p>
    </div>
  );
}

// ── Photos (Unsplash) ─────────────────────────────────────────────────────────
function ImageTab({ active, onPick }: { active: boolean; onPick: (m: PickedMedia) => void }) {
  const { query, setQuery, items, loading, configured } = useMediaSearch<ImageItem>(active, "/api/media/image");

  if (configured === false) return <NotConfigured what="Photo" envVar="UNSPLASH_ACCESS_KEY" />;

  function pick(p: ImageItem) {
    // Fire-and-forget Unsplash download-trigger (their API guideline).
    if (p.downloadLocation) void trackUnsplashDownload(p.downloadLocation);
    onPick({ src: p.src, alt: p.alt });
  }

  return (
    <div>
      <SearchBox value={query} onChange={setQuery} placeholder="Search photos (e.g. teamwork, desk, city)…" />
      {loading && items.length === 0 ? (
        <GridSpinner />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 hover:ring-2 hover:ring-brand-400"
              title={`Photo by ${p.creditName} on Unsplash`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={p.alt} className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                {p.creditName}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-neutral-400 text-right">Photos from Unsplash</p>
    </div>
  );
}

function GridSpinner() {
  return (
    <div className="flex items-center justify-center py-14 text-neutral-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

// ── URL ───────────────────────────────────────────────────────────────────────
function UrlTab({ onPick }: { onPick: (m: PickedMedia) => void }) {
  const [url, setUrl] = React.useState("");
  const [alt, setAlt] = React.useState("");

  function submit() {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("Enter a full image URL starting with http(s)://");
      return;
    }
    onPick({ src: trimmed, alt: alt.trim() });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700">Image URL</label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <p className="text-xs text-neutral-400">Must be a publicly reachable URL (needed so it renders in emails).</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700">Alt text (optional)</label>
        <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Short description of the image" />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={submit}>
          Insert
        </Button>
      </div>
    </div>
  );
}
