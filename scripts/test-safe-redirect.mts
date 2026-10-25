// Tiny sanity check for safeRedirectPath. No test runner needed.
// Run with: npx tsx scripts/test-safe-redirect.mts
// (If tsx is unavailable, `npx tsc --noEmit` still type-checks the helper.)

import assert from "node:assert/strict";

// Matches the other scripts/*.mts walks: resolve the `@/` alias via tsx.
const { safeRedirectPath } = await import("@/lib/auth/safe-redirect");

const cases: Array<[string | null | undefined, string | null]> = [
  // Allowed — same-origin absolute paths.
  ["/dashboard/sessions/abc-123", "/dashboard/sessions/abc-123"],
  ["/", "/"],
  ["/reset-password", "/reset-password"], // hyphens must survive
  ["/admin/clients/42?tab=notes#booking-9", "/admin/clients/42?tab=notes#booking-9"],

  // Rejected — off-site or malformed.
  ["//evil.com", null], // protocol-relative
  ["https://evil.com", null], // absolute with scheme
  ["http://evil.com", null],
  ["/\\evil.com", null], // backslash the browser may rewrite to "/"
  ["\\\\evil.com", null], // does not start with "/"
  ["javascript:alert(1)", null],
  ["dashboard", null], // no leading slash
  ["", null],
  [null, null],
  [undefined, null],
  ["/bad\npath", null], // control char (newline)
  ["/" + "a".repeat(600), null], // over length cap
];

let passed = 0;
for (const [input, expected] of cases) {
  const actual = safeRedirectPath(input);
  assert.equal(actual, expected, `safeRedirectPath(${JSON.stringify(input)}) → ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  passed++;
}

console.log(`safe-redirect: ${passed}/${cases.length} assertions passed`);
