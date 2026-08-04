/**
 * Repair newsletter link marks that were saved without a web address.
 *
 * A Tiptap link mark with no `href` renders as ordinary text in the sent email —
 * the reader sees the words but has nothing to click. This backfills an address
 * onto every such mark in one issue.
 *
 * Dry-runs by default; pass --apply to write.
 *
 *   npx tsx --env-file=.env.local scripts/repair-newsletter-links.mts <issueId> <url>
 *   npx tsx --env-file=.env.local scripts/repair-newsletter-links.mts <issueId> <url> --apply
 */

import { createClient } from "@supabase/supabase-js";

type Node = {
  type?: string;
  text?: string;
  marks?: { type?: string; attrs?: Record<string, unknown> | null }[];
  content?: Node[];
  [key: string]: unknown;
};

const [issueId, url] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");

if (!issueId || !url) {
  console.error(
    "Usage: npx tsx --env-file=.env.local scripts/repair-newsletter-links.mts <issueId> <url> [--apply]"
  );
  process.exit(1);
}

try {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
} catch {
  console.error(`✖ "${url}" is not a valid http(s) URL.`);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hasUsableHref(mark: { attrs?: Record<string, unknown> | null }): boolean {
  const href = mark?.attrs?.href;
  return typeof href === "string" && href.trim() !== "";
}

/** Returns a repaired copy plus the anchor text of everything it touched. */
function repair(node: Node, href: string, fixed: string[]): Node {
  if (!node || typeof node !== "object") return node;
  const next: Node = { ...node };

  if (Array.isArray(next.marks)) {
    next.marks = next.marks.map((mark) => {
      if (mark?.type !== "link" || hasUsableHref(mark)) return mark;
      fixed.push(next.text?.trim() || "(untitled link)");
      return { ...mark, attrs: { ...(mark.attrs ?? {}), href } };
    });
  }

  if (Array.isArray(next.content)) {
    next.content = next.content.map((child) => repair(child, href, fixed));
  }

  return next;
}

const { data, error } = await supabase
  .from("newsletter_issues")
  .select("id, title, status, content")
  .eq("id", issueId)
  .single();

if (error || !data) {
  console.error(`✖ Could not load issue ${issueId}: ${error?.message ?? "not found"}`);
  process.exit(1);
}

const issue = data as { id: string; title: string; status: string; content: Node };

console.log(`Issue:  ${issue.title}`);
console.log(`Status: ${issue.status}`);
console.log(`URL:    ${url}\n`);

const fixed: string[] = [];
const repaired = repair(issue.content, url, fixed);

if (fixed.length === 0) {
  console.log("✔ Nothing to repair — every link already has an address.");
  process.exit(0);
}

console.log(`Found ${fixed.length} link${fixed.length === 1 ? "" : "s"} with no address:`);
for (const text of fixed) console.log(`  • ${text}`);

if (!apply) {
  console.log("\nDry run — nothing written. Re-run with --apply to save.");
  process.exit(0);
}

const { error: updateError } = await supabase
  .from("newsletter_issues")
  .update({ content: repaired, updated_at: new Date().toISOString() })
  .eq("id", issueId);

if (updateError) {
  console.error(`\n✖ Write failed: ${updateError.message}`);
  process.exit(1);
}

console.log(`\n✔ Repaired ${fixed.length} link${fixed.length === 1 ? "" : "s"}.`);
