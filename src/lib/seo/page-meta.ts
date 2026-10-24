import type { Metadata } from "next";
import { OG_DEFAULTS } from "./og";

// WHY THIS FILE EXISTS: every indexable page needs three things that are easy to
// forget one at a time — a <link rel="canonical">, an og:url, and a page-level
// openGraph that still carries the shared defaults (see og.ts: a page-level
// openGraph REPLACES the root's, so it must spread OG_DEFAULTS or it silently
// drops the preview image, site name and type). pageMeta() emits all three from
// one call so a page can never ship a canonical without an og:url, or an
// openGraph without the defaults.
//
// RULES this encodes (enforced at build time by scripts/check-og-url.mjs and
// scripts/check-og-image.mjs):
//   • canonical and og:url are the SAME path, resolved against metadataBase
//     (the canonical www host set in src/app/layout.tsx), so both stay on www.
//   • og:url is written LAST, after the caller's openGraph extras, so a page can
//     add type/publishedTime/images without ever dropping the canonical og:url.
//   • The root layout must NOT set canonical or og:url — children inherit the
//     root openGraph, so a url there would make every page claim to be the home.
//   • A segment that ships its own opengraph-image file (src/app/card) must NOT
//     use this helper: it hand-writes its own openGraph with no images key.
//
// `description` is omitted when falsy so a blog post with no excerpt inherits the
// root description instead of writing null over it (writing an undefined key
// stores null and WIPES the inherited value — see blog/[slug]).

export interface PageMetaOptions {
  /** Document <title>. The root template adds " | Thryve Growth Co." unless absoluteTitle is set. */
  title: string;
  /** Meta description + the default for the share description. Pass "" to inherit the site default. */
  description: string;
  /** og:title. Defaults to `${title} | Thryve Growth Co.`. Homepage passes the full title. */
  shareTitle?: string;
  /** og:description. Defaults to description. */
  shareDescription?: string;
  /** Extra openGraph fields (e.g. { type: "article", publishedTime, images }). Spread last; cannot drop og:url. */
  openGraph?: Partial<NonNullable<Metadata["openGraph"]>>;
  /** Homepage: the title is already complete, so skip the " | Thryve Growth Co." template. */
  absoluteTitle?: boolean;
}

/** Validate the path: absolute, no query/hash, no trailing slash except the root. */
function assertPath(path: string): void {
  if (!path.startsWith("/")) {
    throw new Error(`pageMeta: path must start with "/" (got ${JSON.stringify(path)})`);
  }
  if (path.includes("?") || path.includes("#")) {
    throw new Error(`pageMeta: path must not contain a query or hash (got ${JSON.stringify(path)})`);
  }
  if (path.length > 1 && path.endsWith("/")) {
    throw new Error(`pageMeta: path must not have a trailing slash (got ${JSON.stringify(path)})`);
  }
}

export function pageMeta(path: `/${string}`, o: PageMetaOptions): Metadata {
  assertPath(path);

  const shareTitle = o.shareTitle ?? `${o.title} | Thryve Growth Co.`;
  const shareDescription = o.shareDescription ?? o.description;

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    ...OG_DEFAULTS,
    title: shareTitle,
    ...(shareDescription ? { description: shareDescription } : {}),
    ...o.openGraph,
    // Written last: the caller's extras can override the image or type, but the
    // canonical og:url always survives them and always equals the path.
    url: path,
  };

  const meta: Metadata = {
    title: o.absoluteTitle ? { absolute: o.title } : o.title,
    alternates: { canonical: path },
    openGraph,
  };
  if (o.description) meta.description = o.description;
  return meta;
}
