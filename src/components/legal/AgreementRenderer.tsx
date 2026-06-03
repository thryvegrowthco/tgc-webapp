// Server-side renderer for service agreement content. Used by the public
// /legal/service-agreement route, the onboarding signing step, the booking
// re-acceptance preview, and the admin signed-copy detail page.

import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";
import { legalRenderExtensions } from "@/lib/legal/extensions";

interface AgreementRendererProps {
  content: JSONContent;
  className?: string;
}

export function AgreementRenderer({ content, className }: AgreementRendererProps) {
  const html = generateHTML(content, legalRenderExtensions);
  return (
    <div
      className={
        className ??
        "prose prose-neutral prose-sm sm:prose-base max-w-none " +
          "prose-headings:font-display prose-headings:text-neutral-900 " +
          "prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 " +
          "prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2 " +
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
