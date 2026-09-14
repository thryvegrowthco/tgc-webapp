import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildVCard } from "@/lib/card/contact";

// "Save to contacts" on /card. Prerendered at build time, so the headshot is read
// from public/ during the build and never at request time. A route handler (not a
// static .vcf in public/) so the response carries an explicit vCard content type.
export const dynamic = "force-static";

export async function GET() {
  const photo = await readFile(join(process.cwd(), "public/images/headshots/rachel-card.jpg"));
  return new Response(buildVCard(photo.toString("base64")), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Rachel Dietz.vcf"',
      "X-Robots-Tag": "noindex",
    },
  });
}
