"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { SearchDoc } from "@/lib/help/docs";

interface Hit {
  key: string;
  title: string;
  label: string;
  href: string;
  rank: number; // 0 title/desc, 1 heading, 2 body
}

function excerpt(body: string, idx: number, len: number): string {
  const start = Math.max(0, idx - 40);
  const slice = body.slice(start, idx + len + 80).replace(/\s+/g, " ").trim();
  return (start > 0 ? "…" : "") + slice + "…";
}

export function DocSearch({ index, autoFocus = false }: { index: SearchDoc[]; autoFocus?: boolean }) {
  const [q, setQ] = React.useState("");
  const query = q.trim().toLowerCase();

  const results = React.useMemo<Hit[]>(() => {
    if (query.length < 2) return [];
    const hits: Hit[] = [];
    for (const doc of index) {
      const titleHit = doc.title.toLowerCase().includes(query) || doc.description.toLowerCase().includes(query);
      if (titleHit) {
        hits.push({ key: doc.slug, title: doc.title, label: doc.description, href: `/admin/help/${doc.slug}`, rank: 0 });
      }
      for (const h of doc.headings) {
        if (h.text.toLowerCase().includes(query)) {
          hits.push({ key: `${doc.slug}#${h.anchor}`, title: doc.title, label: h.text, href: `/admin/help/${doc.slug}#${h.anchor}`, rank: 1 });
        }
      }
      if (!titleHit) {
        const bodyIdx = doc.body.toLowerCase().indexOf(query);
        const alreadyHeading = hits.some((x) => x.key.startsWith(doc.slug + "#"));
        if (bodyIdx >= 0 && !alreadyHeading) {
          hits.push({ key: `${doc.slug}:body`, title: doc.title, label: excerpt(doc.body, bodyIdx, query.length), href: `/admin/help/${doc.slug}`, rank: 2 });
        }
      }
    }
    return hits.sort((a, b) => a.rank - b.rank).slice(0, 12);
  }, [query, index]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search help…"
          aria-label="Search help docs"
          className="h-9 w-full rounded-md border border-neutral-200 bg-white pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      {query.length >= 2 && (
        <div className="mt-2 space-y-0.5">
          {results.length === 0 ? (
            <p className="px-2 py-1 text-xs text-neutral-400">No matches.</p>
          ) : (
            results.map((r) => (
              <Link
                key={r.key}
                href={r.href}
                className="block rounded-md px-2 py-1.5 hover:bg-neutral-50"
                onClick={() => setQ("")}
              >
                <span className="block text-xs font-medium text-neutral-800">{r.title}</span>
                <span className="block truncate text-xs text-neutral-500">{r.label}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
