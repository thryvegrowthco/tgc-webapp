/**
 * Bot-trap check for public form submissions. `company_website` is a hidden
 * honeypot field (see `HoneypotField`) that real users never fill. Returns true
 * when the request body carries a non-empty value for it, so routes can silently
 * drop the submission (return 200, write nothing, send nothing).
 */
export function isHoneypotTripped(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const value = (body as Record<string, unknown>).company_website;
  return typeof value === "string" && value.trim().length > 0;
}
