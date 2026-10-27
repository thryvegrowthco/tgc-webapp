#!/usr/bin/env node
// Fails the build if an em dash (U+2014) appears in customer-facing copy.
//
// Scans .ts/.tsx under the directories below (plus a couple of explicit files),
// after stripping `//` line comments and `/* */` block comments (including JSX
// `{/* */}`), so an em dash in a comment is allowed but one in a string, JSX
// text, or template literal is not. Prefer periods, commas, colons, parentheses,
// or "1 to 2" style ranges instead. Admin UI and the generated help content are
// excluded.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EM_DASH = "—";

const SCAN_DIRS = [
  "src/app/(marketing)",
  "src/app/(auth)",
  "src/app/(booking)",
  "src/app/(proposals)",
  "src/app/(testimonial)",
  "src/app/(dashboard)",
  "src/app/card",
  "src/app/llms.txt",
  "src/components/marketing",
  "src/components/shared",
  "src/components/layout",
  "src/components/booking",
  "src/components/intake",
  "src/components/testimonial",
  "src/components/dashboard",
  "src/components/seo",
  "src/lib/email",
  "src/lib/seo",
  "src/lib/intake",
];

const SCAN_FILES = [
  "src/app/actions/testimonials.ts",
  "src/app/actions/watchlist.ts",
];

const EXCLUDE_PREFIXES = [
  "src/lib/help/content.generated.ts",
  "src/app/(admin)",
  "src/components/admin",
];

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function isExcluded(rel) {
  return EXCLUDE_PREFIXES.some((p) => rel === p || rel.startsWith(p + "/"));
}

function walk(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // directory may not exist in this checkout
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(ROOT, full));
    if (isExcluded(rel)) continue;
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
  }
}

// Replace comment characters with spaces/newlines so line numbers are preserved,
// while keeping string and template-literal contents verbatim (those are checked).
// Regex literals are tracked too, so a quote inside one (e.g. /href="([^"]*)"/)
// doesn't wrongly flip the scanner into a string state.
function stripComments(src) {
  let out = "";
  let state = "code"; // code | line | block | squote | dquote | template | regex
  let i = 0;
  let last = ""; // last significant (non-whitespace) char emitted in code state
  let inCharClass = false;
  const n = src.length;
  const blank = (c) => (c === "\n" ? "\n" : c === "\t" ? "\t" : " ");
  // A `/` starts a regex (not division) when the previous significant char is an
  // operator, opener, or nothing — the usual heuristic for lexing without a parser.
  // `<` and `>` are excluded so JSX tags (`</div>`, `/>`) are never read as regex.
  const regexCanStart = () => last === "" || "([{=,;:!&|?+-*/%~^".includes(last);
  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : "";
    if (state === "code") {
      if (c === "/" && c2 === "/") { state = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && c2 === "*") { state = "block"; out += "  "; i += 2; continue; }
      if (c === "/" && regexCanStart()) { state = "regex"; inCharClass = false; out += c; i++; continue; }
      if (c === "'") { state = "squote"; out += c; last = c; i++; continue; }
      if (c === '"') { state = "dquote"; out += c; last = c; i++; continue; }
      if (c === "`") { state = "template"; out += c; last = c; i++; continue; }
      out += c;
      if (!/\s/.test(c)) last = c;
      i++; continue;
    }
    if (state === "line") {
      if (c === "\n") { state = "code"; out += "\n"; i++; continue; }
      out += blank(c); i++; continue;
    }
    if (state === "block") {
      if (c === "*" && c2 === "/") { state = "code"; out += "  "; i += 2; continue; }
      out += blank(c); i++; continue;
    }
    if (state === "regex") {
      if (c === "\\") { out += c; if (i + 1 < n) out += src[i + 1]; i += 2; continue; }
      if (c === "[") inCharClass = true;
      else if (c === "]") inCharClass = false;
      else if (c === "/" && !inCharClass) { state = "code"; out += c; last = c; i++; continue; }
      out += c; i++; continue;
    }
    // String / template states: copy verbatim, honoring escapes.
    if (c === "\\") { out += c; if (i + 1 < n) out += src[i + 1]; i += 2; continue; }
    const quote = state === "squote" ? "'" : state === "dquote" ? '"' : "`";
    if (c === quote) { state = "code"; out += c; last = c; i++; continue; }
    out += c; i++; continue;
  }
  return out;
}

const files = [];
for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), files);
for (const file of SCAN_FILES) {
  const full = path.join(ROOT, file);
  if (fs.existsSync(full)) files.push(full);
}

const hits = [];
for (const full of files) {
  const rel = toPosix(path.relative(ROOT, full));
  const cleaned = stripComments(fs.readFileSync(full, "utf8"));
  cleaned.split("\n").forEach((line, idx) => {
    if (line.includes(EM_DASH)) {
      hits.push(`${rel}:${idx + 1}: ${line.trim()}`);
    }
  });
}

if (hits.length > 0) {
  console.error(
    `check-no-emdash: found ${hits.length} em dash(es) (U+2014) in customer-facing copy.\n` +
      "Replace with a period, comma, colon, parentheses, or \"1 to 2\" range:\n"
  );
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}

console.log(`check-no-emdash: no em dashes in ${files.length} scanned files.`);
