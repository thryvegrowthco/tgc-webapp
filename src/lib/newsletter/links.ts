// Link inspection for newsletter content (Tiptap ProseMirror JSON).
//
// One definition of "does this link mark have a usable address?", shared by the
// server-side renderer (which drops broken links) and the admin UI (which warns
// about them before you send). Deliberately free of @tiptap/html so a client
// component can import auditLinks without pulling the renderer into the bundle.

import type { JSONContent } from "@tiptap/react";

type Mark = NonNullable<JSONContent["marks"]>[number];

/** A link mark only counts if it carries a non-empty href. */
function hasUsableHref(mark: Mark): boolean {
  const href = mark?.attrs?.href;
  return typeof href === "string" && href.trim() !== "";
}

// Drop link marks that have no usable href so a broken/pasted "link" (e.g. text
// pasted in from Google Docs that carried link styling without a real address)
// renders as normal text instead of a dead, unclickable <a>. Button-created
// links always have an href and pass through untouched.
export function stripEmptyLinks<T extends JSONContent>(node: T): T {
  if (!node || typeof node !== "object") return node;
  const next: JSONContent = { ...node };
  if (Array.isArray(next.marks)) {
    next.marks = next.marks.filter((m) => m?.type !== "link" || hasUsableHref(m));
    if (next.marks.length === 0) delete next.marks;
  }
  if (Array.isArray(next.content)) {
    next.content = next.content.map((c) => stripEmptyLinks(c));
  }
  return next as T;
}

export interface LinkAudit {
  /** Every link mark in the document. */
  total: number;
  /** Anchor text of each link that has no web address, in document order. */
  missingHref: string[];
}

/**
 * Walk newsletter content and report links that would silently render as plain
 * text when sent. Surfaced in the admin UI so a broken link is caught before a
 * send rather than after.
 */
export function auditLinks(node: JSONContent | null | undefined): LinkAudit {
  const audit: LinkAudit = { total: 0, missingHref: [] };

  function walk(current: JSONContent | null | undefined): void {
    if (!current || typeof current !== "object") return;
    if (Array.isArray(current.marks)) {
      for (const mark of current.marks) {
        if (mark?.type !== "link") continue;
        audit.total += 1;
        if (!hasUsableHref(mark)) {
          audit.missingHref.push(current.text?.trim() || "(untitled link)");
        }
      }
    }
    if (Array.isArray(current.content)) current.content.forEach(walk);
  }

  walk(node);
  return audit;
}
