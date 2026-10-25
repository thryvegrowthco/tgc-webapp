// Validate a caller-supplied post-login / post-confirmation redirect target.
//
// We only ever trust SAME-ORIGIN ABSOLUTE PATHS (e.g. "/dashboard/sessions/x").
// Anything that could bounce the user off-site is rejected by returning null so
// the caller can fall back to a safe default (their role landing page). This is
// our open-redirect guard: the `redirect` query param on /login and the `next`
// param on the auth callback are both attacker-controllable.
//
// Rejected: absolute URLs with a scheme ("https://evil.com"), protocol-relative
// URLs ("//evil.com"), backslash tricks some browsers rewrite to "/" ("/\evil"),
// control characters, over-long values, and anything not starting with "/".

const MAX_LENGTH = 512;

// Control characters: the C0 range (0x00-0x1F) plus DEL (0x7F). Checked
// numerically so no literal control bytes live in this source file.
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function safeRedirectPath(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.length > MAX_LENGTH) return null;
  // Must be an absolute path on this origin.
  if (!input.startsWith("/")) return null;
  // "//host" is protocol-relative and resolves off-site.
  if (input.startsWith("//")) return null;
  // Browsers may treat "\" as "/", so "/\evil.com" can become "//evil.com".
  if (input.includes("\\")) return null;
  // Newlines, tabs, and other control chars could enable header/redirect tricks.
  if (hasControlChar(input)) return null;
  return input;
}
