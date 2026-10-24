#!/usr/bin/env node
/**
 * Guards the site's default link preview image. Local, deterministic, no network.
 *
 * 1. public/images/site/og-image.jpg exists, is a JPEG, and its real pixel size
 *    equals the width and height declared in src/lib/seo/og.ts.
 * 2. The ?v= token in OG_IMAGE.url is the first 8 hex of that file's sha256, so a
 *    regenerated picture cannot ship behind the URL scrapers have already cached.
 * 3. The file sits inside a sane byte range, which catches a blank or failed render.
 * 4. Every page or layout that sets `openGraph` spreads OG_DEFAULTS, EXCEPT a
 *    segment that ships its own opengraph-image file, which must NOT spread it and
 *    must not set an `images` key: either one suppresses that file.
 *
 * Comments are stripped before the spread is matched, so naming OG_DEFAULTS in prose
 * cannot satisfy the rule. Every predicate is proven against a planted violation
 * before the real check runs, because a guard that cannot fail is not a guard.
 *
 * Runs in prebuild. `npm run check:og` runs it alone.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, relative } from "node:path";

const ROOT = process.cwd();
const IMAGE = join(ROOT, "public/images/site/og-image.jpg");
const OG_TS = join(ROOT, "src/lib/seo/og.ts");
const APP = join(ROOT, "src/app");
const MIN_BYTES = 20_000;
const MAX_BYTES = 400_000;

/* ------------------------------ pure predicates ------------------------------ */

/** Strip block and line comments, leaving string contents alone (URLs keep their //). */
function stripComments(src) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      if (c === "\\") {
        out += c + (next ?? "");
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      out += c;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Width and height from the JPEG's own SOF marker. */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

/** The url, width and height OG_IMAGE declares. */
function declared(src) {
  const url = src.match(/url:\s*"([^"]+)"/)?.[1] ?? null;
  const width = Number(src.match(/width:\s*(\d+)/)?.[1] ?? NaN);
  const height = Number(src.match(/height:\s*(\d+)/)?.[1] ?? NaN);
  return { url, width, height };
}

function sizeProblems(real, decl) {
  if (!real) return ["public/images/site/og-image.jpg is not a JPEG"];
  if (real.width !== decl.width || real.height !== decl.height) {
    return [
      `og-image.jpg is ${real.width}x${real.height} but src/lib/seo/og.ts declares ${decl.width}x${decl.height}`,
    ];
  }
  return [];
}

function tokenProblems(hash, url) {
  const token = url?.match(/\?v=([0-9a-f]+)/)?.[1] ?? null;
  if (!token) return ['OG_IMAGE.url has no ?v= cache token; scrapers cache against the URL'];
  if (!hash.startsWith(token)) {
    return [
      `OG_IMAGE.url says ?v=${token} but the file's sha256 starts ${hash.slice(0, 8)}. ` +
        `Set url to "/images/site/og-image.jpg?v=${hash.slice(0, 8)}".`,
    ];
  }
  return [];
}

function bytesProblems(bytes) {
  if (bytes < MIN_BYTES) return [`og-image.jpg is only ${bytes} bytes; a blank or failed render`];
  if (bytes > MAX_BYTES) return [`og-image.jpg is ${bytes} bytes, over the ${MAX_BYTES} budget`];
  return [];
}

/** The body of `export const metadata = { … }`, so `images:` elsewhere is ignored. */
function metadataBlock(code) {
  const start = code.indexOf("export const metadata");
  if (start === -1) return null;
  const open = code.indexOf("{", start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}" && --depth === 0) return code.slice(open, i + 1);
  }
  return null;
}

function spreadProblems(rel, src, hasOwnImageFile) {
  const code = stripComments(src);
  if (!/openGraph\s*:/.test(code)) return [];
  // pageMeta() (src/lib/seo/page-meta.ts) spreads OG_DEFAULTS and writes og:url
  // itself, so a page that delegates to it needs no inline spread even though its
  // source carries an `openGraph:` key (the extras it passes the helper). A segment
  // that ships its own image file never uses the helper, so the exemption is gated
  // on that to keep the card's own-image rules below in force.
  if (/\bpageMeta\s*\(/.test(code) && !hasOwnImageFile) return [];
  const spreads = /\.\.\.\s*OG_DEFAULTS\b/.test(code);
  const setsImages = /\bimages\s*:/.test(metadataBlock(code) ?? code);
  const problems = [];
  if (hasOwnImageFile) {
    if (spreads) {
      problems.push(
        `${rel} spreads OG_DEFAULTS, but this segment ships its own opengraph-image file. ` +
          `The spread's images key suppresses that file and replaces its preview with the site default.`
      );
    }
    if (setsImages) {
      problems.push(
        `${rel} sets an images key, which suppresses this segment's own opengraph-image file.`
      );
    }
  } else if (!spreads) {
    problems.push(
      `${rel} sets openGraph without spreading OG_DEFAULTS, so it ships no preview image, ` +
        `site name or type. Add "...OG_DEFAULTS," as the first line of its openGraph object.`
    );
  }
  return problems;
}

/* --------------------- prove each predicate before trusting it --------------------- */

function selfProof() {
  const planted = [
    ["declared size drift", sizeProblems({ width: 1200, height: 631 }, { width: 1200, height: 630 })],
    ["not a jpeg", sizeProblems(null, { width: 1200, height: 630 })],
    ["stale cache token", tokenProblems("deadbeef0000", "/images/site/og-image.jpg?v=abc12345")],
    ["missing cache token", tokenProblems("deadbeef0000", "/images/site/og-image.jpg")],
    ["empty render", bytesProblems(12)],
    ["oversized render", bytesProblems(MAX_BYTES + 1)],
    [
      "page with openGraph and no spread",
      spreadProblems("planted.tsx", "export const metadata = { openGraph: { title: 'x' } };", false),
    ],
    [
      "OG_DEFAULTS only in a comment",
      spreadProblems(
        "planted.tsx",
        "// ...OG_DEFAULTS is deliberately not used here\nexport const metadata = { openGraph: { title: 'x' } };",
        false
      ),
    ],
    [
      "spread onto a segment with its own image file",
      spreadProblems(
        "planted.tsx",
        "export const metadata = { openGraph: { ...OG_DEFAULTS, title: 'x' } };",
        true
      ),
    ],
    [
      "images key on a segment with its own image file",
      spreadProblems("planted.tsx", "export const metadata = { openGraph: { images: [] } };", true),
    ],
  ];
  const blind = planted.filter(([, problems]) => problems.length === 0).map(([what]) => what);
  if (blind.length) {
    console.error(`check-og-image: these checks did not catch a planted violation: ${blind.join(", ")}`);
    process.exit(1);
  }
  // And the clean cases must stay quiet, or the guard is just noise.
  const falsePositives = [
    ["clean size", sizeProblems({ width: 1200, height: 630 }, { width: 1200, height: 630 })],
    ["clean token", tokenProblems("abc123450000", "/images/site/og-image.jpg?v=abc12345")],
    ["clean bytes", bytesProblems(60_000)],
    [
      "page with the spread",
      spreadProblems("planted.tsx", "export const metadata = { openGraph: { ...OG_DEFAULTS } };", false),
    ],
    ["page with no openGraph at all", spreadProblems("planted.tsx", "export const metadata = { title: 'x' };", false)],
    [
      "page delegating to pageMeta with openGraph extras",
      spreadProblems("planted.tsx", "export const metadata = pageMeta('/x', { openGraph: { type: 'article' } });", false),
    ],
    [
      "segment with its own image file and no images key",
      spreadProblems("planted.tsx", "export const metadata = { openGraph: { title: 'x' } };", true),
    ],
  ];
  const noisy = falsePositives.filter(([, problems]) => problems.length > 0).map(([what]) => what);
  if (noisy.length) {
    console.error(`check-og-image: these checks fired on a clean case: ${noisy.join(", ")}`);
    process.exit(1);
  }
}

/* ---------------------------------- the run ---------------------------------- */

function pagesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...pagesUnder(full));
    else if (entry === "page.tsx" || entry === "layout.tsx") out.push(full);
  }
  return out;
}

selfProof();

const problems = [];

if (!existsSync(IMAGE)) {
  problems.push(
    "public/images/site/og-image.jpg is missing. Build it with designs/thryve-growth-co/og-image/build_og.mjs."
  );
} else {
  const bytes = readFileSync(IMAGE);
  const decl = declared(readFileSync(OG_TS, "utf8"));
  problems.push(...sizeProblems(jpegSize(bytes), decl));
  problems.push(...tokenProblems(createHash("sha256").update(bytes).digest("hex"), decl.url));
  problems.push(...bytesProblems(bytes.length));
}

for (const file of pagesUnder(APP)) {
  const hasOwnImageFile = readdirSync(dirname(file)).some((f) => /^opengraph-image\./.test(f));
  problems.push(...spreadProblems(relative(ROOT, file), readFileSync(file, "utf8"), hasOwnImageFile));
}

if (problems.length) {
  console.error(`\ncheck-og-image: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

console.log("check-og-image: default preview image matches its declaration, and every openGraph page carries it.");
