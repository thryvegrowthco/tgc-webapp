"use client";

// Newsletter-specific rich text editor. Uses the shared
// newsletterEditorExtensions from src/lib/newsletter/extensions.ts so the
// editor and the server-side renderer (newsletter-render.ts) can't drift.
//
// The toolbar is a subset of RichTextEditor.tsx — same look, fewer options,
// because email clients render fewer marks/nodes reliably.

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { newsletterEditorExtensions } from "@/lib/newsletter/extensions";
import { cn } from "@/lib/utils";
import { MediaPicker } from "@/components/admin/MediaPicker";
import type { JSONContent } from "@tiptap/react";

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 min-w-8 px-1.5 rounded text-sm font-medium transition-colors",
        active
          ? "bg-brand-100 text-brand-700"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-neutral-200 mx-1 self-center" />;
}

interface NewsletterEditorProps {
  initialContent?: JSONContent | null;
  onChange?: (content: JSONContent) => void;
  placeholder?: string;
  className?: string;
}

export function NewsletterEditor({
  initialContent,
  onChange,
  placeholder = "Write your weekly note…",
  className,
}: NewsletterEditorProps) {
  const [mediaOpen, setMediaOpen] = React.useState(false);
  const editor = useEditor({
    extensions: [
      ...newsletterEditorExtensions,
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: {
        class: "prose prose-neutral prose-sm max-w-none focus:outline-none min-h-[480px] px-5 py-4",
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON());
    },
  });

  if (!editor) return null;

  function setLink() {
    const url = window.prompt("URL", editor?.getAttributes("link").href ?? "");
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().unsetLink().run();
      return;
    }
    editor?.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-neutral-100 bg-neutral-50">
        <ToolbarButton
          title="Section heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Subheading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <em>I</em>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          • —
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1.—
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          &quot;
        </ToolbarButton>
        <ToolbarButton
          title="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          —
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Link" onClick={setLink} active={editor.isActive("link")}>
          🔗
        </ToolbarButton>
        <ToolbarButton title="Insert image or GIF" onClick={() => setMediaOpen(true)}>
          🖼
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          ↪
        </ToolbarButton>

        <span className="ml-auto text-xs text-neutral-400">
          {editor.storage.characterCount.characters()} chars
        </span>
      </div>

      <EditorContent editor={editor} />

      <MediaPicker
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSelect={({ src, alt }) => editor.chain().focus().setImage({ src, alt }).run()}
      />
    </div>
  );
}
