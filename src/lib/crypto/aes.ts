// AES-256-GCM encryption helper for sensitive data at rest.
// Currently used to encrypt Google OAuth tokens before storing in
// `admin_integrations`.
//
// Key requirement: 32-byte (256-bit) key in `INTEGRATIONS_ENCRYPTION_KEY`,
// hex-encoded (so 64 hex chars). Generate with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Encrypted payload format:
//   `<iv hex>:<auth tag hex>:<ciphertext hex>`
// 12-byte IV (recommended for GCM), 16-byte auth tag.

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!hex) throw new Error("INTEGRATIONS_ENCRYPTION_KEY is not set");
  if (hex.length !== 64) throw new Error("INTEGRATIONS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted payload format");
  const [ivHex, tagHex, ctHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("Corrupted encrypted payload");
  }
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const ct = Buffer.from(ctHex, "hex");
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  return plaintext;
}
