// Admin Help center — doc registry, loader, TOC parser, and search index.
// Content comes from the build-time-generated module (see
// scripts/generate-help-content.mjs); the source markdown lives in /docs.

import GithubSlugger from "github-slugger";
import { HELP_CONTENT } from "./content.generated";

export type HelpCategory = "Getting Started" | "Reference" | "Workflows";

export interface HelpDocMeta {
  slug: string;
  title: string;
  category: HelpCategory;
  description: string;
}

// Order here drives the sidebar order within each category.
export const HELP_DOCS: HelpDocMeta[] = [
  {
    slug: "rachel-admin-guide",
    title: "Admin Guide",
    category: "Getting Started",
    description:
      "How to use every part of the admin — availability, invitations, sessions, clients, blog, newsletter, and more.",
  },
  {
    slug: "admin-email-reference",
    title: "Email Reference",
    category: "Reference",
    description: "Every automated email: when it sends, what it says, and how to edit it.",
  },
  {
    slug: "admin-faq",
    title: "FAQ & Status Glossary",
    category: "Reference",
    description: "What each status means, plus answers to common questions.",
  },
  {
    slug: "booking-invitation-flow",
    title: "Booking Flow Diagrams",
    category: "Workflows",
    description: "Visual maps of the booking invitation → session workflow.",
  },
];

export const HELP_CATEGORY_ORDER: HelpCategory[] = ["Getting Started", "Reference", "Workflows"];

export interface TocItem {
  level: number; // 2 or 3
  text: string;
  anchor: string;
}

/** Strip inline markdown so heading text matches what rehype-slug slugs. */
function stripInline(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images → alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → text
    .replace(/[*_~`]/g, "") // emphasis / code markers
    .replace(/<[^>]+>/g, "") // inline html
    .trim();
}

/**
 * Parse `##`/`###` headings into a TOC. Skips fenced code blocks so a `##`
 * inside a ```mermaid``` block isn't treated as a heading. Uses one
 * github-slugger per doc and advances it on EVERY heading (h1–h6) so the
 * generated anchors match rehype-slug's ids (including its de-dup counters)
 * exactly, even though only h2/h3 land in the TOC.
 */
export function parseToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.*\S)\s*$/);
    if (!m) continue;
    const level = m[1].length;
    const text = stripInline(m[2].replace(/\s+#+\s*$/, ""));
    const anchor = slugger.slug(text); // advance for every heading
    if (level >= 2 && level <= 3) toc.push({ level, text, anchor });
  }
  return toc;
}

export interface HelpDoc {
  meta: HelpDocMeta;
  markdown: string;
  toc: TocItem[];
}

export function getDoc(slug: string): HelpDoc | null {
  const meta = HELP_DOCS.find((d) => d.slug === slug);
  if (!meta) return null;
  const markdown = HELP_CONTENT[meta.slug];
  if (markdown == null) return null;
  return { meta, markdown, toc: parseToc(markdown) };
}

export interface SearchDoc {
  slug: string;
  title: string;
  category: HelpCategory;
  description: string;
  headings: { text: string; anchor: string }[];
  body: string; // raw markdown; the client lowercases for case-insensitive matching
}

/** Serializable index handed to the client <DocSearch> component. */
export function buildSearchIndex(): SearchDoc[] {
  return HELP_DOCS.map((meta) => {
    const md = HELP_CONTENT[meta.slug] ?? "";
    return {
      slug: meta.slug,
      title: meta.title,
      category: meta.category,
      description: meta.description,
      headings: parseToc(md).map((t) => ({ text: t.text, anchor: t.anchor })),
      body: md,
    };
  });
}
