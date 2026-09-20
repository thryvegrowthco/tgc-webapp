#!/usr/bin/env node
/**
 * Post-deploy sweep: every page's link preview image actually loads.
 *
 *   node scripts/check-og-live.mjs https://www.thryvegrowth.co
 *
 * Manual on purpose, never wired into a build: it makes network calls, and a build
 * must not go flaky on someone else's DNS. This is the only check that can see the
 * one preview image that comes from data rather than code (a blog post's featured
 * image is a database value), and it is also what catches an image that exists in
 * git and fails to deploy, which is the exact shape of the bug it was written for.
 *
 * GET requests only. Nothing here submits a form or writes anything.
 */
const base = (process.argv[2] ?? "https://www.thryvegrowth.co").replace(/\/$/, "");
const UA = "Mozilla/5.0 (compatible; thryve-og-check/1.0; +https://www.thryvegrowth.co)";

/** Routes the sitemap deliberately omits but that people still share. */
const EXTRA = ["/card", "/consultation", "/testimonials"];

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

  const image = metaContent(html, "property", "og:image");
  if (!image) {
    console.error(`  FAIL  ${path}: no og:image`);
    problems++;
    continue;
  }

  if (!cache.has(image)) {
    const res = await fetch(image, { headers: { "User-Agent": UA }, redirect: "manual" });
    const type = res.headers.get("content-type") ?? "";
    const ok = res.status === 200 && type.startsWith("image/");
    cache.set(image, { ok, detail: `${res.status} ${type || "no content type"}` });
  }
  const { ok, detail } = cache.get(image);
  if (ok) {
    console.log(`  ok    ${path} -> ${image} (${detail})`);
  } else {
    console.error(`  FAIL  ${path} -> ${image} answered ${detail}`);
    problems++;
  }
}

console.log(`\n${paths.length} routes checked, ${cache.size} distinct images.`);
if (problems) {
  console.error(`${problems} problem(s).`);
  process.exit(1);
}
console.log("Every route serves a preview image that loads.");
