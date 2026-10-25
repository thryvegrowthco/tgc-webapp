// HMAC-SHA256 signing for unauthenticated, shareable links.
//
// Used by the calendar `.ics` download route so a client can add a session to
// their calendar straight from an email (no login): the link carries a `?t=`
// token that is the HMAC of the booking id. A token only grants read access to
// that one booking's calendar file, nothing else.
//
// Reuses INTEGRATIONS_ENCRYPTION_KEY (already present for Google token
// encryption) so no new secret is introduced. The message is domain-separated
// with a fixed context prefix so these signatures can never collide with any
// other use of the same key.

import { createHmac, timingSafeEqual } from "node:crypto";

// Bump the version suffix if the token meaning ever changes (old links expire).
const ICS_CONTEXT = "ics-v1:";

function getKey(): Buffer {
  const hex = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!hex) throw new Error("INTEGRATIONS_ENCRYPTION_KEY is not set");
  if (hex.length !== 64) {
    throw new Error("INTEGRATIONS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/** URL-safe HMAC token authorizing read access to a single booking's .ics file. */
export function signIcsToken(bookingId: string): string {
  return createHmac("sha256", getKey()).update(ICS_CONTEXT + bookingId).digest("base64url");
}

/** Constant-time check that `token` is a valid signature for `bookingId`. */
export function verifyIcsToken(bookingId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(signIcsToken(bookingId));
  } catch {
    return false;
  }
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
