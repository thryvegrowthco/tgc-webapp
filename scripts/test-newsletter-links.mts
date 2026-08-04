// Newsletter links — READ-ONLY regression guard. NO DB access, NO writes.
// Guards the bug where a link added in the editor arrived in the inbox as
// plain, unclickable text because the link mark carried no href.
// Run: npx tsx scripts/test-newsletter-links.mts

const { renderIssueHTML, renderIssueText } = await import("@/lib/email/newsletter-render");
const { auditLinks, stripEmptyLinks } = await import("@/lib/newsletter/links");
const { normalizeLinkHref, emailSafeBaseUrl } = await import("@/lib/editor/links");

let pass = 0,
  fail = 0;
const check = (label: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra !== undefined ? `  — ${JSON.stringify(extra)}` : ""}`);
  if (ok) pass++;
  else fail++;
};

const URL_ = "https://www.thryvegrowth.co/career-reset-workbook";
const BASE = "https://www.thryvegrowth.co";

const doc = (marks: unknown[]) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Download the workbook here", marks }],
    },
  ],
});

const goodDoc = doc([{ type: "link", attrs: { href: URL_ } }]);
// The exact shape found in the database: a link mark with no attrs at all.
const bareDoc = doc([{ type: "link" }, { type: "bold" }]);

try {
  // ── Rendering: a real link must survive into both email parts ───────────────
  const html = renderIssueHTML({ subject: "s", preheader: "p", content: goodDoc });
  check("html: emits an anchor with the href", html.includes(`href="${URL_}"`));
  check("html: anchor wraps the text", /<a[^>]*>[\s\S]*?Download the workbook here[\s\S]*?<\/a>/.test(html));

  const text = renderIssueText({ subject: "s", preheader: "p", content: goodDoc });
  check("text: keeps the URL (was stripped entirely)", text.includes(URL_));
  check("text: keeps the anchor text too", text.includes("Download the workbook here"));
  check("text: carries an unsubscribe placeholder", text.includes("{{unsubscribe_url}}"));
  check("text: carries a manage placeholder", text.includes("{{manage_url}}"));

  // ── The bug: href-less marks are detected, not silently downgraded ──────────
  const audit = auditLinks(bareDoc);
  check("audit: flags the href-less link", audit.total === 1 && audit.missingHref.length === 1, audit);
  check("audit: names the offending text", audit.missingHref[0] === "Download the workbook here");
  check("audit: clean doc reports nothing missing", auditLinks(goodDoc).missingHref.length === 0);

  const stripped = renderIssueHTML({ subject: "s", preheader: "p", content: bareDoc });
  check("render: href-less link never emits a dead <a>", !/<a[^>]*>Download/.test(stripped));
  check("strip: leaves other marks intact", JSON.stringify(stripEmptyLinks(bareDoc)).includes('"bold"'));

  // ── Normalizer ─────────────────────────────────────────────────────────────
  check("url: bare host gets https://", normalizeLinkHref("thryvegrowth.co/x", { baseUrl: BASE }).href === "https://thryvegrowth.co/x");
  check("url: root-relative is absolutized", normalizeLinkHref("/x", { baseUrl: BASE }).href === `${BASE}/x`);
  check("url: fragment rejected for email", !!normalizeLinkHref("#x", { baseUrl: BASE }).error);
  check("url: fragment allowed for the blog", normalizeLinkHref("#x", { baseUrl: BASE, allowFragment: true }).href === "#x");
  check("url: mailto passes through", normalizeLinkHref("mailto:hello@thryvegrowth.co", { baseUrl: BASE }).href === "mailto:hello@thryvegrowth.co");
  check("url: javascript: rejected", !!normalizeLinkHref("javascript:alert(1)", { baseUrl: BASE }).error);
  check("url: empty rejected", !!normalizeLinkHref("   ", { baseUrl: BASE }).error);
  check("url: https passes unchanged", normalizeLinkHref(URL_, { baseUrl: BASE }).href === URL_);

  // ── Base URL guard: never email a localhost link ────────────────────────────
  check("base: localhost falls back to production", emailSafeBaseUrl("http://localhost:3000") === BASE);
  check("base: undefined falls back to production", emailSafeBaseUrl(undefined) === BASE);
  check("base: https value is kept", emailSafeBaseUrl("https://example.com") === "https://example.com");
} catch (err) {
  console.error("💥", err instanceof Error ? (err.stack ?? err.message) : err);
  fail++;
}

console.log(`\n${fail === 0 ? "🎉 ALL PASS" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
