import type { Metadata, Viewport } from "next";
import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CARD_CONTACT, VCARD_PATH } from "@/lib/card/contact";

// Printed business cards encode https://www.thryvegrowth.co/card as a QR code, so
// every card in circulation depends on this route: change what the page says
// freely, but never delete or move it. The card's print build (Desktop/Apps/
// designs/thryve-growth-co/business-card, outside this repo) fetches this page live
// and refuses to write print files unless it still carries the name, the booking
// link, the email and the contact download.
//
// Standalone on purpose (no marketing Header/Footer): the card's own palette, cream
// front and sage back, and the three things someone who just met Rachel wants.
// Copy has no dashes, the owner's rule for everything tied to the card.

const c = CARD_CONTACT;

const SHARE_TITLE = `${c.fullName} | Thryve Growth Co.`;
const SHARE_DESCRIPTION =
  "Clarity. Accountability. Real Growth. Book a free consultation with Rachel or save her contact details.";

export const metadata: Metadata = {
  title: c.fullName,
  description: `${c.fullName}, founder of Thryve Growth Co. HR consulting, leadership and career coaching.`,
  // QR traffic only, and the rest of the site never publishes Rachel's surname.
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    siteName: "Thryve Growth Co.",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    url: "/card",
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
  },
};

// Where the browser supports it, tints its own chrome above the page to the cream
// of the card's front.
export const viewport: Viewport = {
  themeColor: "#f5ece3",
};

// One-liners as the site's own navigation describes these services.
const SERVICES = [
  {
    href: "/services/hr-consulting",
    title: "HR Consulting & Team Development",
    body: "Strategic HR support for organizations that want clarity, structure, and stronger leadership.",
  },
  {
    href: "/services/coaching",
    title: "Career & Leadership Coaching",
    body: "Clarity, confidence, and accountability to help you move forward with intention.",
  },
];

// Tracked capitals, set as the printed card sets its title and service line (+0.10em).
const CAPS = "text-[0.6875rem] uppercase tracking-[0.1em] text-brand-500";

export default function CardPage() {
  return (
    <main className="min-h-dvh bg-muted font-sans md:bg-border md:px-6 md:py-16">
      <div className="mx-auto max-w-md overflow-hidden md:rounded-3xl md:shadow-xl">
        {/* The front of the card */}
        <section className="bg-muted px-6 pb-7 pt-9 text-center">
          <Image
            src="/logos/FAVORITE 1 (2).png"
            alt="Thryve Growth Co."
            width={264}
            height={88}
            loading="eager"
            fetchPriority="high"
            className="mx-auto h-auto w-[16.5rem]"
          />
          <p className="mt-1 text-sm font-semibold tracking-wide text-brand-500">
            Clarity. Accountability. Real Growth.
          </p>
        </section>

        {/* The back of the card. The photo sits beside the name so that on a phone the
            Book button stays above the site's cookie banner on a first visit. */}
        <section className="bg-brand-100 px-6 pb-9 pt-7">
          <div className="flex items-center gap-4">
            <Image
              src="/images/headshots/rachel-card.jpg"
              alt=""
              width={72}
              height={72}
              loading="eager"
              className="h-18 w-18 flex-none rounded-full ring-[3px] ring-muted"
            />
            <h1 className="font-display text-4xl font-bold tracking-tight text-brand-800">{c.fullName}</h1>
          </div>
          <p className={`mt-4 font-semibold ${CAPS}`}>
            {c.titleLead}
            <span aria-hidden="true" className="mx-2.5 inline-block h-[0.8em] w-px translate-y-[0.1em] bg-brand-400" />
            <span className="sr-only">, </span>
            {c.titleRole}
          </p>
          <div aria-hidden="true" className="mt-4 h-px w-9 bg-brand-500" />

          <div className="mt-6 grid gap-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/consultation">Book a free consultation</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full">
              <a href={VCARD_PATH}>Save to contacts</a>
            </Button>
          </div>
          <a
            href={`mailto:${c.email}`}
            className="mt-3 inline-block py-2.5 text-[0.9375rem] text-brand-800 underline decoration-brand-400/60 underline-offset-4 hover:decoration-brand-800"
          >
            {c.email}
          </a>
        </section>

        {/* About */}
        <section className="bg-white px-6 pb-10 pt-8">
          <p className="text-[0.9375rem] leading-relaxed text-neutral-700">
            Rachel is an HR professional and career coach with 10+ years of experience helping individuals and
            organizations grow with intention.
          </p>
          {/* The card's service line: one line from a 360px screen up (10px type below 390px).
              Narrower, it wraps only after a bullet, never inside a service. */}
          <p className="mt-7 text-[0.625rem] uppercase tracking-[0.1em] text-brand-500 min-[390px]:text-[0.6875rem]">
            {c.services.map((service, i) => (
              <Fragment key={service}>
                {i > 0 && (
                  <>
                    {"\u00a0"}
                    <span aria-hidden="true" className="text-brand-400">•</span>
                    <span className="sr-only">,</span>{" "}
                  </>
                )}
                <span className="whitespace-nowrap">{service}</span>
              </Fragment>
            ))}
          </p>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {SERVICES.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="group flex items-center justify-between gap-4 py-4">
                  <span>
                    <span className="block font-display text-base font-semibold text-brand-800">{s.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-neutral-600">{s.body}</span>
                  </span>
                  <span aria-hidden="true" className="text-brand-500 transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/" className="mt-6 inline-block py-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
            Explore thryvegrowth.co <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-1 flex gap-6 text-sm text-neutral-500">
            <a href={c.linkedin} className="py-2 hover:text-brand-700">
              LinkedIn
            </a>
            <a href={c.instagram} className="py-2 hover:text-brand-700">
              Instagram
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
