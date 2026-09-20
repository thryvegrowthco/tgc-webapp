// WHY THIS FILE EXISTS: in Next 16 a page-level `openGraph` REPLACES the root
// layout's whole openGraph object, it does not merge into it (mergeMetadata's
// `case 'openGraph'` assigns resolveOpenGraph(metadata.openGraph) over the
// accumulated value). So any page that sets `openGraph` just to give itself a share
// title silently drops the image, the site name and the type. Spread OG_DEFAULTS
// into every page-level `openGraph`; scripts/check-og-image.mjs fails the build if a
// page forgets.
//
// WHY NOT a root src/app/opengraph-image.jpg instead: the file convention is injected
// only while that same segment's own metadata has no `images` key, and a child
// segment that sets `openGraph` assigns over whatever the root resolved. Either way
// it fixes none of the pages that set their own openGraph.
//
// DO NOT spread this into a segment that ships its own opengraph-image file
// (src/app/card): an `images` key there, whatever its value, suppresses that
// segment's opengraph-image.jpg and the business card's preview silently becomes
// this generic one.
//
// twitter images are deliberately not set anywhere: Next copies openGraph.images,
// with width, height, type and alt, into twitter whenever twitter has no images key.

export const SITE_URL = "https://www.thryvegrowth.co";

/**
 * Built by designs/thryve-growth-co/og-image/build_og.mjs (outside this repo).
 * Never hand edit or re-crop the file.
 *
 * The ?v= token is the first 8 hex of the JPEG's sha256. Facebook, LinkedIn and X
 * cache a scrape against the image URL, and this URL spent its whole life serving a
 * 404, so the picture has to arrive as a NEW url for anything to re-fetch it.
 * scripts/check-og-image.mjs recomputes the hash and fails the build on any drift.
 */
export const OG_IMAGE = {
  url: "/images/site/og-image.jpg?v=6004c06b",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "The Thryve Growth Co. logo on cream above the words Clarity. Accountability. Real Growth.",
};

/** Spread FIRST into a page-level `openGraph`, then override title and description. */
export const OG_DEFAULTS = {
  type: "website" as const,
  siteName: "Thryve Growth Co.",
  images: [OG_IMAGE],
};
