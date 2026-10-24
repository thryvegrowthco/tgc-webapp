#!/usr/bin/env node
/**
 * Guards the self-referential canonical + og:url contract. Local, deterministic, no network.
 *
 *   (a) Every page.tsx under src/app/(marketing) that is NOT noindex must either call
 *       pageMeta(...) (which emits canonical + og:url for its path) or hand-write BOTH
 *       a canonical and an openGraph url:. A page with one but not the other is the
 *       exact bug this was written for.
 *   (b) Every path in sitemap.ts STATIC_ROUTES resolves to a page file that passes (a).
 *       `${BASE_URL}/x` parses to /x; a bare BASE_URL is the home "/".
 *   (c) src/app/layout.tsx (the root) must NOT set a canonical or an openGraph url:.
 *       Children inherit the root openGraph, so a url there makes every page that sets
 *       no openGraph of its own claim to be the homepage.
 *   (d) A segment that ships its own opengraph-image file (src/app/card) is noindex and
 *       hand-writes its own og:url, so it is exempt from (a) like any other noindex page.
 *
 * Comments are stripped before matching, so naming `canonical` in prose cannot satisfy
 * a rule. Every predicate is proven against a planted violation and a clean case before
 * the real run, because a guard that cannot fail is not a guard.
 *
 * Runs in prebuild. `npm run check:og` runs it with check-og-image.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const APP = join(ROOT, "src/app");
const MARKETING = join(APP, "(marketing)");
const ROOT_LAYOUT = join(APP, "layout.tsx");
const SITEMAP = join(APP, "sitemap.ts");

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

const isNoindex = (code) => /index\s*:\s*false/.test(code);
const usesPageMeta = (code) => /\bpageMeta\s*\(/.test(code);
const hasCanonical = (code) => /\bcanonical\b/.test(code);
const hasOgUrl = (code) => /\burl\s*:/.test(code);

/** Rule (a): one indexable page carries a canonical + og:url, via the helper or by hand. */
function pageProblems(rel, src) {
  const code = stripComments(src);
  if (isNoindex(code)) return [];
  if (usesPageMeta(code)) return [];
  if (hasCanonical(code) && hasOgUrl(code)) return [];
  return [
    `${rel} is indexable but sets neither pageMeta(...) nor both a canonical and an ` +
      `openGraph url:. Wrap its metadata in pageMeta("/its-path", { ... }).`,
  ];
}

/** Rule (c): the root layout must carry neither a canonical nor an og:url. */
function rootLayoutProblems(rel, src) {
  const code = stripComments(src);
  const problems = [];
  if (hasCanonical(code)) {
    problems.push(`${rel} sets a canonical; the root must not (every page would inherit it as the homepage).`);
  }
  if (hasOgUrl(code)) {
    problems.push(`${rel} sets an openGraph url:; the root must not (every page would inherit it as the homepage).`);
  }
  return problems;
}

/** Rule (b): the paths a sitemap STATIC_ROUTES block declares. */
function staticRoutePaths(src) {
  const code = stripComments(src);
  const block = /STATIC_ROUTES[\s\S]*?=\s*\[([\s\S]*?)\];/.exec(code)?.[1] ?? "";
  const paths = [];
  for (const m of block.matchAll(/url:\s*`\$\{BASE_URL\}(\/[^`]*)`/g)) paths.push(m[1]);
  // A bare `url: BASE_URL` (no template) is the home "/".
  if (/url:\s*BASE_URL\b/.test(block)) paths.push("/");
  return [...new Set(paths)];
}

function routeProblems(path, file) {
  if (!file) return [`sitemap STATIC_ROUTES lists ${path} but no page.tsx resolves it`];
  return [];
}

/* --------------------- prove each predicate before trusting it --------------------- */

function selfProof() {
  const planted = [
    [
      "marketing page with openGraph but no url",
      pageProblems("planted.tsx", "export const metadata = { openGraph: { ...OG_DEFAULTS, title: 'x' } };"),
    ],
    [
      "page with url but no canonical",
      pageProblems("planted.tsx", "export const metadata = { openGraph: { url: '/x', title: 'y' } };"),
    ],
    [
      "root layout with a canonical",
      rootLayoutProblems("layout.tsx", "export const metadata = { alternates: { canonical: '/' } };"),
    ],
    [
      "root layout with an og:url",
      rootLayoutProblems("layout.tsx", "export const metadata = { openGraph: { url: '/' } };"),
    ],
    ["sitemap route with no page", routeProblems("/ghost", null)],
  ];
  const blind = planted.filter(([, p]) => p.length === 0).map(([what]) => what);
  if (blind.length) {
    console.error(`check-og-url: these checks did not catch a planted violation: ${blind.join(", ")}`);
    process.exit(1);
  }

  const parsed = staticRoutePaths(
    "const STATIC_ROUTES: MetadataRoute.Sitemap = [\n  { url: BASE_URL },\n  { url: `${BASE_URL}/about` },\n];"
  );
  if (!(parsed.length === 2 && parsed.includes("/") && parsed.includes("/about"))) {
    console.error(`check-og-url: STATIC_ROUTES parser is broken, got ${JSON.stringify(parsed)}`);
    process.exit(1);
  }

  const falsePositives = [
    [
      "page delegating to pageMeta",
      pageProblems("planted.tsx", "export const metadata = pageMeta('/x', { title: 'y', description: 'z' });"),
    ],
    [
      "page that hand-writes canonical + url",
      pageProblems("planted.tsx", "export const metadata = { alternates: { canonical: '/x' }, openGraph: { url: '/x' } };"),
    ],
    ["noindex page with nothing else", pageProblems("planted.tsx", "export const metadata = { robots: { index: false } };")],
    [
      "card segment (noindex, own og:url)",
      pageProblems("planted.tsx", "export const metadata = { robots: { index: false }, openGraph: { url: '/card' } };"),
    ],
    [
      "clean root layout",
      rootLayoutProblems("layout.tsx", "export const metadata = { metadataBase: new URL(x), openGraph: { title: 'y' } };"),
    ],
    ["route that resolves to a page", routeProblems("/about", "src/app/(marketing)/about/page.tsx")],
  ];
  const noisy = falsePositives.filter(([, p]) => p.length > 0).map(([what]) => what);
  if (noisy.length) {
    console.error(`check-og-url: these checks fired on a clean case: ${noisy.join(", ")}`);
    process.exit(1);
  }
}

/* ---------------------------------- the run ---------------------------------- */

function pagesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...pagesUnder(full));
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

/** A URL path -> the page file that serves it, ignoring route groups. */
function fileForPath(p) {
  const sub = p === "/" ? "" : p;
  const candidates = [join(MARKETING, sub, "page.tsx"), join(APP, sub, "page.tsx")];
  return candidates.find((f) => existsSync(f)) ?? null;
}

selfProof();

const problems = new Set();

// (a) every indexable marketing page.
for (const file of pagesUnder(MARKETING)) {
  for (const p of pageProblems(relative(ROOT, file), readFileSync(file, "utf8"))) problems.add(p);
}

// (b) every sitemap route resolves to a page that passes (a).
for (const path of staticRoutePaths(readFileSync(SITEMAP, "utf8"))) {
  const file = fileForPath(path);
  for (const p of routeProblems(path, file)) problems.add(p);
  if (file) {
    for (const p of pageProblems(relative(ROOT, file), readFileSync(file, "utf8"))) problems.add(p);
  }
}

// (c) the root layout carries neither.
for (const p of rootLayoutProblems(relative(ROOT, ROOT_LAYOUT), readFileSync(ROOT_LAYOUT, "utf8"))) {
  problems.add(p);
}

if (problems.size) {
  console.error(`\ncheck-og-url: ${problems.size} problem(s)\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

console.log("check-og-url: every indexable page carries a canonical + og:url, and the root layout carries neither.");
