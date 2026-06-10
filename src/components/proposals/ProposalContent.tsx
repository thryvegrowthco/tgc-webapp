// Server-side renderer for proposal scope/terms content. The extension set MUST
// match RichTextEditor.tsx (StarterKit headings 2–4, no codeBlock, Link, Image)
// or content renders empty — the silent-mismatch bug warned about in CLAUDE.md.

import { generateHTML } from "@tiptap/html";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import type { JSONContent } from "@tiptap/react";

const proposalRenderExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    codeBlock: false,
  }),
  Link.configure({
    HTMLAttributes: { rel: "noopener noreferrer", class: "text-brand-700 underline underline-offset-4" },
  }),
  Image.configure({
    HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-4" },
  }),
];

function isEmptyDoc(content: JSONContent | null | undefined): boolean {
  if (!content) return true;
  const nodes = content.content;
  return !Array.isArray(nodes) || nodes.length === 0;
}

export function ProposalContent({ content }: { content: JSONContent | null | undefined }) {
  if (isEmptyDoc(content)) return null;
  const html = generateHTML(content as JSONContent, proposalRenderExtensions);
  return (
    <div
      className={
        "prose prose-neutral prose-sm sm:prose-base max-w-none " +
        "prose-headings:font-display prose-headings:text-neutral-900 " +
        "prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 " +
        "prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2 " +
        "prose-p:text-neutral-700 prose-p:leading-relaxed " +
        "prose-li:text-neutral-700 prose-li:my-1 " +
        "prose-strong:text-neutral-900 " +
        "prose-a:text-brand-700 prose-a:no-underline hover:prose-a:underline " +
        "prose-hr:my-6"
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
