// Server component: renders admin help markdown with GitHub-flavored markdown
// (tables etc.), heading anchors (for the TOC + search deep-links), and the
// `prose` typography used by the blog. ```mermaid fences render as live
// diagrams via the lazy client <Mermaid> island.

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Mermaid } from "./Mermaid";

// Mirrors the blog renderer's prose styling (src/app/(marketing)/blog/[slug]/page.tsx).
const PROSE_CLASS = `prose prose-neutral max-w-none
  prose-headings:font-display prose-headings:font-bold prose-headings:text-neutral-900
  prose-h1:text-3xl prose-h1:mb-2
  prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:scroll-mt-24
  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:scroll-mt-24
  prose-p:text-neutral-700 prose-p:leading-relaxed
  prose-li:text-neutral-700
  prose-strong:text-neutral-900
  prose-a:text-brand-700 prose-a:no-underline hover:prose-a:underline
  prose-table:text-sm prose-th:text-neutral-900
  prose-code:bg-neutral-100 prose-code:rounded prose-code:px-1 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
  print:border-0 print:p-0 print:shadow-none`;

const components: Components = {
  code(props) {
    const { className, children, ...rest } = props;
    if (typeof className === "string" && className.includes("language-mermaid")) {
      return <Mermaid chart={String(children).replace(/\n$/, "")} />;
    }
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  },
  pre(props) {
    const node = props.node as
      | { children?: { properties?: { className?: unknown } }[] }
      | undefined;
    const cls = node?.children?.[0]?.properties?.className;
    if (Array.isArray(cls) && cls.includes("language-mermaid")) {
      // The code override already returned <Mermaid>; drop the <pre> wrapper.
      return <>{props.children}</>;
    }
    return <pre {...props} />;
  },
};

export function MarkdownDoc({ markdown }: { markdown: string }) {
  return (
    <article className={PROSE_CLASS}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
