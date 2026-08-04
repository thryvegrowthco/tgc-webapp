// Shared link normalization for the Tiptap toolbars (newsletter + blog).
//
// Why this exists: a link typed into the editor has to survive two very
// different destinations. On the site a relative "/career-reset-workbook" is
// fine; in an email there is no base URL, so the same href resolves against the
// mail client's own domain and is simply dead. Anything that reaches an email
// therefore has to be absolute.
//
// Pure module — no DOM, no Tiptap, no env reads. Callers supply the base URL so
// this stays testable and safe to import from a client component.

const PASSTHROUGH_SCHEMES = /^(mailto:|tel:)/i;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export interface NormalizeLinkOptions {
  /** Absolute origin used to expand root-relative hrefs. Must include the scheme. */
  baseUrl: string;
  /** Allow "#section" hrefs. True for the blog, false for email. */
  allowFragment?: boolean;
}

/**
 * Turn whatever the admin typed into an absolute, email-safe href.
 * Returns `{ href }` on success or `{ error }` with a message fit for a toast.
 */
export function normalizeLinkHref(
  input: string,
  { baseUrl, allowFragment = false }: NormalizeLinkOptions
): { href?: string; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Enter a web address." };

  if (PASSTHROUGH_SCHEMES.test(trimmed)) return { href: trimmed };

  if (trimmed.startsWith("#")) {
    if (allowFragment) return { href: trimmed };
    return {
      error: "Jump links (#…) don't work in email. Use a full web address instead.",
    };
  }

  // Root-relative — expand against the site so the link works from an inbox.
  const candidate = trimmed.startsWith("/")
    ? `${baseUrl.replace(/\/+$/, "")}${trimmed}`
    : // No scheme at all ("thryvegrowth.co/x") — assume https.
      /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { error: `"${trimmed}" isn't a valid web address.` };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { error: `Links can't use "${url.protocol}" — use http, https, mailto or tel.` };
  }

  return { href: url.toString() };
}

/**
 * Base URL for links that will be emailed. Never absolutize into a localhost
 * origin — a dev value in NEXT_PUBLIC_APP_URL would otherwise ship
 * "http://localhost:3000/…" links to real subscribers.
 */
export function emailSafeBaseUrl(appUrl: string | undefined): string {
  return appUrl?.startsWith("https://") ? appUrl : "https://www.thryvegrowth.co";
}
