// Schema.org JSON-LD builders for Thryve Growth Co. Keep every public fact here
// in sync with the owner-approved facts (see the audit notes): Rachel Dietz, PHR;
// based in Sun Prairie, Wisconsin; public-sector HR background in general terms
// only. No AggregateRating or Review schema, and no owner/developer other than
// Rachel in anything public.
import { SITE_URL } from "./og";
import { SOCIAL_LINKS, RACHEL_LINKEDIN, GOOGLE_BUSINESS_PROFILE_URL } from "@/lib/site/social";

/** Absolute URL for a site-relative path. */
function abs(path: string): string {
  return `${SITE_URL}${path}`;
}

// Stable @id anchors so nodes can reference each other across pages.
export const ORG_ID = `${SITE_URL}/#org`;
export const RACHEL_ID = `${SITE_URL}/about#rachel`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const LOGO_URL = abs("/logos/logo.svg");
const OG_IMAGE_URL = abs("/images/site/og-image.jpg");
const RACHEL_HEADSHOT_URL = abs("/images/headshots/rachel-profile.webp");

const SCHEMA_CONTEXT = "https://schema.org";

/** Company social profiles for Organization.sameAs (GBP only when set). */
function orgSameAs(): string[] {
  const links: string[] = [SOCIAL_LINKS.linkedin, SOCIAL_LINKS.instagram];
  if (GOOGLE_BUSINESS_PROFILE_URL) links.push(GOOGLE_BUSINESS_PROFILE_URL);
  return links;
}

export function organizationNode(): object {
  return {
    "@type": ["Organization", "ProfessionalService"],
    "@id": ORG_ID,
    name: "Thryve Growth Co.",
    legalName: "Thryve Growth Co. LLC",
    url: SITE_URL,
    logo: LOGO_URL,
    image: OG_IMAGE_URL,
    email: "hello@thryvegrowth.co",
    slogan: "Clarity. Accountability. Real Growth.",
    description:
      "HR consulting, career coaching, leadership coaching, interview preparation, and resume writing for individuals and small businesses. Based in Sun Prairie, Wisconsin, and delivered virtually nationwide.",
    founder: { "@id": RACHEL_ID },
    foundingDate: "2026",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sun Prairie",
      addressRegion: "WI",
      addressCountry: "US",
    },
    areaServed: [
      { "@type": "State", name: "Wisconsin" },
      { "@type": "Country", name: "United States" },
    ],
    priceRange: "$75 to $750+",
    sameAs: orgSameAs(),
  };
}

export function personNode(): object {
  return {
    "@type": "Person",
    "@id": RACHEL_ID,
    name: "Rachel Dietz",
    honorificSuffix: "PHR",
    jobTitle: "Founder, HR Consultant and Career Coach",
    worksFor: { "@id": ORG_ID },
    image: RACHEL_HEADSHOT_URL,
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: "Professional in Human Resources (PHR)",
      recognizedBy: {
        "@type": "Organization",
        name: "HR Certification Institute (HRCI)",
      },
    },
    knowsAbout: [
      "Human resources",
      "Career coaching",
      "Leadership development",
      "Interview preparation",
      "Resume writing",
      "Recruiting",
    ],
    // Only advertise Rachel's LinkedIn once the owner confirms it (see social.ts).
    ...(RACHEL_LINKEDIN ? { sameAs: [RACHEL_LINKEDIN] } : {}),
  };
}

export function websiteNode(): object {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: "Thryve Growth Co.",
    publisher: { "@id": ORG_ID },
  };
}

/** Site-wide graph, rendered once in the marketing layout. */
export function siteGraph(): object {
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [organizationNode(), personNode(), websiteNode()],
  };
}

export interface OfferInput {
  /** Human label for the offer (e.g. "Single Session"). */
  name?: string;
  /** Fixed price as a string, e.g. "125". */
  price?: string;
  /** Minimum price for "from $X" style offers, e.g. "500". */
  minPrice?: string;
  /**
   * Billing period for recurring offers (e.g. "MONTH"). When set alongside
   * `price`, the Offer gains a UnitPriceSpecification so the price reads as
   * per-period rather than one-time.
   */
  unitText?: string;
}

function offerNode(o: OfferInput): object {
  if (o.minPrice) {
    return {
      "@type": "Offer",
      ...(o.name ? { name: o.name } : {}),
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: o.minPrice,
        priceCurrency: "USD",
      },
    };
  }
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    ...(o.name ? { name: o.name } : {}),
    price: o.price,
    priceCurrency: "USD",
  };
  if (o.unitText) {
    offer.priceSpecification = {
      "@type": "UnitPriceSpecification",
      price: o.price,
      priceCurrency: "USD",
      unitText: o.unitText,
    };
  }
  return offer;
}

export interface ServiceSchemaInput {
  /** Path under /services, e.g. "coaching". */
  slug: string;
  name: string;
  description: string;
  /** Omit entirely for quote-only services. */
  offers?: OfferInput[];
}

function breadcrumbNode(items: { name: string; url: string }[]): object {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Service + BreadcrumbList graph for a single /services/* page. */
export function serviceGraph(input: ServiceSchemaInput): object {
  const url = abs(`/services/${input.slug}`);
  const service: Record<string, unknown> = {
    "@type": "Service",
    name: input.name,
    description: input.description,
    provider: { "@id": ORG_ID },
    areaServed: [
      { "@type": "State", name: "Wisconsin" },
      { "@type": "Country", name: "United States" },
    ],
    url,
  };
  if (input.offers && input.offers.length > 0) {
    service.offers = input.offers.map(offerNode);
  }

  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      service,
      breadcrumbNode([
        { name: "Home", url: SITE_URL },
        { name: "Services", url: abs("/services") },
        { name: input.name, url },
      ]),
    ],
  };
}

export interface ArticleSchemaInput {
  slug: string;
  title: string;
  datePublished?: string | null;
  dateModified?: string | null;
  /** Absolute image URL when the post has a featured image. */
  image?: string | null;
}

/** Article + BreadcrumbList graph for a single blog post. */
export function blogPostGraph(input: ArticleSchemaInput): object {
  const url = abs(`/blog/${input.slug}`);
  const article: Record<string, unknown> = {
    "@type": "Article",
    headline: input.title,
    author: { "@id": RACHEL_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: url,
    url,
  };
  if (input.datePublished) article.datePublished = input.datePublished;
  if (input.dateModified ?? input.datePublished) {
    article.dateModified = input.dateModified ?? input.datePublished;
  }
  if (input.image) article.image = input.image;

  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      article,
      breadcrumbNode([
        { name: "Home", url: SITE_URL },
        { name: "Blog", url: abs("/blog") },
        { name: input.title, url },
      ]),
    ],
  };
}

/** FAQPage graph built from the FAQ page's question/answer data. */
export function faqPageGraph(items: { q: string; a: string }[]): object {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
