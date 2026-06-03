// Shared Tiptap extension set for the service agreement editor and the
// server-side renderer. Keeping these together prevents the silent
// empty-render bug warned about in CLAUDE.md (renderer extensions must be a
// subset of editor extensions).

import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";

// Editor-side: includes Placeholder + CharacterCount which the renderer
// doesn't need (UI-only chrome).
export const legalEditorExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    codeBlock: false,
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: "text-brand-700 underline underline-offset-4",
      rel: "noopener noreferrer",
    },
  }),
];

// Server-side (HTML render). Same node set; minimal styling.
export const legalRenderExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    codeBlock: false,
  }),
  Link.configure({
    HTMLAttributes: {
      rel: "noopener noreferrer",
      class: "text-brand-700 underline underline-offset-4",
    },
  }),
];
