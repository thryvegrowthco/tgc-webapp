// Rachel's contact details for the /card page and its "Save to contacts" vCard.
// One source, so the page and the saved contact can never disagree. The printed
// business card carries the same copy (Desktop/Apps/designs/thryve-growth-co/
// business-card/card.json, outside this repo): change them together.

export const VCARD_PATH = "/card/rachel-dietz.vcf";

export const CARD_CONTACT = {
  givenName: "Rachel",
  familyName: "Dietz",
  fullName: "Rachel Dietz",
  titleLead: "Founder",
  titleRole: "HR Consultant & Coach",
  organization: "Thryve Growth Co.",
  email: "rachel@thryvegrowth.co",
  website: "https://www.thryvegrowth.co",
  consultationUrl: "https://www.thryvegrowth.co/consultation",
  services: ["HR Consulting", "Leadership", "Career Coaching"],
  linkedin: "https://www.linkedin.com/company/thryvegrowthco/",
  instagram: "https://www.instagram.com/thryvegrowthco/",
} as const;

/** RFC 2426 §4: backslash, newline, comma and semicolon are escaped in text values. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

const encoder = new TextEncoder();

/**
 * RFC 2425 §5.8.1: a line longer than 75 octets is folded with CRLF and one
 * space. Folds between characters, never inside a multi-byte UTF-8 sequence.
 */
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines spend one octet on the leading space.
    const limit = parts.length === 0 ? 75 : 74;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** Rachel's contact card as vCard 3.0. Pass the headshot as base64 JPEG to embed it. */
export function buildVCard(photoJpegBase64?: string): string {
  const c = CARD_CONTACT;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeText(c.familyName)};${escapeText(c.givenName)};;;`,
    `FN:${escapeText(c.fullName)}`,
    `ORG:${escapeText(c.organization)}`,
    `TITLE:${escapeText(`${c.titleLead}, ${c.titleRole}`)}`,
    `EMAIL;TYPE=INTERNET,WORK:${c.email}`,
    `URL:${c.website}`,
    `NOTE:${escapeText(`${c.services.join(" • ")}\nBook a free consultation: ${c.consultationUrl}`)}`,
  ];
  if (photoJpegBase64) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photoJpegBase64}`);
  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n") + "\r\n";
}
