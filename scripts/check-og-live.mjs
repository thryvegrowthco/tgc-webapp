#!/usr/bin/env node
/**
 * Post-deploy sweep: every page's link preview image loads, its og:url and
 * <link rel="canonical"> point at the canonical www host.
 *
 *   node scripts/check-og-live.mjs [fetchBase] [canonicalOrigin]
 *   node scripts/check-og-live.mjs https://www.thryvegrowth.co
 *   node scripts/check-og-live.mjs http://localhost:3100            # still expects www values
 *   node scripts/check-og-live.mjs https://preview.example http://localhost:3100
 *
 * fetchBase (arg 1, default https://www.thryvegrowth.co) is where pages are fetched
 * from. canonicalOrigin (arg 2, default https://www.thryvegrowth.co) is the origin the
 * og:url/canonical are EXPECTED to carry — they are absolute because metadataBase is
 * the www host, so even a localhost build emits www URLs. That split lets this sweep a
 * preview or a dev server while still asserting the production canonical.
 *
 * For every swept path: og:url must be present and equal the expected URL (compared
 * after stripping one trailing slash). The canonical must match too, EXCEPT on noindex
 * pages where it is optional. og:url stays required on /card (its own share link).
 *
 * Manual on purpose, never wired into a build: it makes network calls, and a build must
 * not go flaky on someone else's DNS. GET requests only; nothing here submits a form.
 */
const base = (process.argv[2] ?? "https://www.thryvegrowth.co").replace(/\/$/, "");
const CANONICAL_ORIGIN = (process.argv[3] ?? "https://www.thryvegrowth.co").replace(/\/$/, "");
const UA = "Mozilla/5.0 (compatible; thryve-og-check/1.0; +https://www.thryvegrowth.co)";

/** Routes the sitemap deliberately omits but that people still share. */
const EXTRA = ["/card", "/consultation", "/testimonials"];

const stripSlash = (s) => s.replace(/\/$/, "");

async function text(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.text();
}

function metaContent(html, attr, value) {
  const re = new RegExp(`<meta[^>]+${attr}="${value}"[^>]*content="([^"]*)"`, "i");
  const reversed = new RegExp(`<meta[^>]+content="([^"]*)"[^>]*${attr}="${value}"`, "i");
  return html.match(re)?.[1] ?? html.match(reversed)?.[1] ?? null;
}

function linkHref(html, rel) {
  const re = new RegExp(`<link[^>]+rel="${rel}"[^>]*href="([^"]*)"`, "i");
  const reversed = new RegExp(`<link[^>]+href="([^"]*)"[^>]*rel="${rel}"`, "i");
  return html.match(re)?.[1] ?? html.match(reversed)?.[1] ?? null;
}

function isNoindex(html) {
  return (
    /<meta[^>]+name="robots"[^>]*content="[^"]*noindex/i.test(html) ||
    /<meta[^>]+content="[^"]*noindex[^"]*"[^>]*name="robots"/i.test(html)
  );
}

const sitemap = await text(`${base}/sitemap.xml`);
const paths = [...new Set([
  ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname),
  ...EXTRA,
])].sort();

let problems = 0;
const cache = new Map();

for (const path of paths) {
  let html;
  try {
    html = await text(`${base}${path}`);
  } catch (err) {
    console.error(`  FAIL  ${path}: ${err.message}`);
    problems++;
    continue;
  }

  const noindex = isNoindex(html);
  const expected = stripSlash(new URL(path, CANONICAL_ORIGIN).href);
  const issues = [];

  // canonical — required for indexable pages, optional for noindex ones.
  const canonical = linkHref(html, "canonical");
  if (canonical === null) {
    if (!noindex) issues.push("no canonical");
  } else if (stripSlash(canonical) !== expected) {
    issues.push(`canonical ${canonical} != ${expected}`);
  }

  // og:url — required everywhere except noindex pages other than /card.
  const ogUrl = metaContent(html, "property", "og:url");
  if (ogUrl === null) {
    if (!noindex || path === "/card") issues.push("no og:url");
  } else if (stripSlash(ogUrl) !== expected) {
    issues.push(`og:url ${ogUrl} != ${expected}`);
  }

  // og:image — present and actually loads (the original purpose of this sweep).
  const image = metaContent(html, "property", "og:image");
  if (!image) {
    issues.push("no og:image");
  } else {
    if (!cache.has(image)) {
      const res = await fetch(image, { headers: { "User-Agent": UA }, redirect: "manual" });
      const type = res.headers.get("content-type") ?? "";
      const ok = res.status === 200 && type.startsWith("image/");
      cache.set(image, { ok, detail: `${res.status} ${type || "no content type"}` });
    }
    const { ok, detail } = cache.get(image);
    if (!ok) issues.push(`og:image ${image} answered ${detail}`);
  }

  if (issues.length) {
    console.error(`  FAIL  ${path}: ${issues.join("; ")}`);
    problems += issues.length;
  } else {
    console.log(`  ok    ${path} -> ${noindex ? "og:url ok (noindex, canonical optional)" : expected}`);
  }
}

console.log(`\n${paths.length} routes checked, ${cache.size} distinct images, canonical origin ${CANONICAL_ORIGIN}.`);
if (problems) {
  console.error(`${problems} problem(s).`);
  process.exit(1);
}
console.log("Every route carries a loading preview image and the expected og:url/canonical.");
