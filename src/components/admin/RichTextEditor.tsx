"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { toast } from "sonner";
import { normalizeLinkHref } from "@/lib/editor/links";
import { toPlainJSON } from "@/lib/editor/json";
import { cn } from "@/lib/utils";
import { MediaPicker } from "@/components/admin/MediaPicker";
import type { JSONContent } from "@tiptap/react";

// ── Toolbar button ────────────────────────────────────────────────────────────
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

// ── Main editor ───────────────────────────────────────────────────────────────
interface RichTextEditorProps {
  initialContent?: JSONContent | null;
  onChange?: (content: JSONContent) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  initialContent,
  onChange,
  placeholder = "Write your post…",
  className,
}: RichTextEditorProps) {
  const [mediaOpen, setMediaOpen] = React.useState(false);
  const editor = useEditor({
    // IMPORTANT: These extensions must stay in sync with renderExtensions in
    // src/app/blog/[slug]/page.tsx. Adding or removing an extension here
    // without updating the renderer causes posts to render incorrectly or produce empty output.
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false, // keep editor simple for Rachel
        link: false, // StarterKit v3 bundles Link; use the configured one below
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { class: "text-brand-700 underline underline-offset-4" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-4" },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: {
        class: "prose prose-neutral prose-sm max-w-none focus:outline-none min-h-[320px] px-5 py-4",
      },
    },
    onUpdate({ editor }) {
      // Plain-prototype copy: Server Actions drop ProseMirror's
      // null-prototype attrs, taking every href/src/level with them.
      onChange?.(toPlainJSON(editor.getJSON()));
    },
  });

  if (!editor) return null;

  function setLink() {
    if (!editor) return;
    const prev = (editor.getAttributes("link").href as string) ?? "";
    const input = window.prompt("Link URL", prev);
    if (input === null) return; // cancelled
    if (input.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }

    // Blog posts are read on the site, so "#section" jump links are fine here.
    const { href, error } = normalizeLinkHref(input, {
      baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://www.thryvegrowth.co",
      allowFragment: true,
    });
    if (error || !href) {
      toast.error(error ?? "That doesn't look like a valid web address.");
      return;
    }

    const applied = editor.state.selection.empty
      ? // Nothing selected — insert the URL itself as a clickable link.
        editor
          .chain()
          .focus()
          .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
          .run()
      : editor.chain().focus().extendMarkRange("link").setLink({ href }).run();

    if (!applied) {
      toast.error("Couldn't apply that link. Select the text you want to link, then try again.");
      return;
    }

    // A link mark without an href renders as ordinary text — never let that
    // happen silently.
    if (editor.getAttributes("link").href !== href) {
      toast.error("The link didn't attach to that text. Re-select the text and try again.");
      return;
    }

    toast.success("Link added");
  }

  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-neutral-100 bg-neutral-50">
        {/* Text style */}
        <ToolbarButton
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
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
        <ToolbarButton
          title="Inline code"
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
        >
          {"<>"}
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
          title="Horizontal rule"
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

      {/* Editor content */}
      <EditorContent editor={editor} />

      <MediaPicker
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSelect={({ src, alt }) => editor.chain().focus().setImage({ src, alt }).run()}
      />
    </div>
  );
}
