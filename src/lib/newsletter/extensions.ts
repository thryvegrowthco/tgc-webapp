// Shared Tiptap extension set used by both the editor (NewsletterIssueForm)
// and the server-side renderer (newsletter-render.ts). Keeping these in one
// module prevents the silent-empty-output bug warned about in CLAUDE.md.
//
// This is a deliberately conservative subset of what RichTextEditor.tsx uses
// for blogs — no callouts or custom blocks that risk breaking in email
// clients. If you add an extension here, it will appear in both contexts.

import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";

export const newsletterEditorExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: "text-brand-700 underline underline-offset-4",
      rel: "noopener noreferrer",
    },
  }),
  Image.configure({
    HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-4" },
  }),
];

// For server-side rendering (no DOM, no editor chrome). Same shape, slightly
// different HTMLAttributes so the email-client styles win.
export const newsletterRenderExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
  }),
  Link.configure({
    HTMLAttributes: {
      rel: "noopener noreferrer",
      // Inline style — most email clients strip class-based styling
      style: "color: #203e35; text-decoration: underline;",
    },
  }),
  Image.configure({
    HTMLAttributes: {
      style: "max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0;",
    },
  }),
];
