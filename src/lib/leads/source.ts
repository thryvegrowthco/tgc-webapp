// Where a lead came from.
//
// `leads.source` is free text in Postgres (supabase/migrations/0006_leads.sql
// declares it `TEXT DEFAULT 'job_watchlist'` — no CHECK, no NOT NULL), so this
// module is the only thing standing between a query string and that column: a
// `?from=` token is stored only when it is one we published, and anything else is
// simply not attribution.
//
// Adding a placement is one line in ENTRY_SOURCES and one in SOURCE_COPY. The copy
// here is tied to the business card, so it follows the owner's rule for card copy:
// no dash or hyphen characters.

/** What a consultation request is worth when no recognised placement sent it. */
export const CONSULTATION_SOURCE = "consultation";

/** Neutral `?from=` placement token → the value stored in `leads.source`. */
const ENTRY_SOURCES = {
  card: "business_card",
} as const;

export type EntryToken = keyof typeof ENTRY_SOURCES;

/** The stored source for a request that started at the business card. */
export const BUSINESS_CARD_SOURCE = ENTRY_SOURCES.card;

/**
 * The `?from=` token when it is one of ours, else null.
 *
 * `Object.hasOwn`, never `in`: `"toString" in ENTRY_SOURCES` is true and would hand
 * back a function. A repeated param (`?from=a&from=b`) reaches Next as an array, and
 * the typeof guard turns it away.
 */
export function entryToken(value: unknown): EntryToken | null {
  return typeof value === "string" && Object.hasOwn(ENTRY_SOURCES, value)
    ? (value as EntryToken)
    : null;
}

/** Stored `leads.source` for a consultation request that carried `from`. */
export function consultationSource(from: unknown): string {
  const token = entryToken(from);
  return token ? ENTRY_SOURCES[token] : CONSULTATION_SOURCE;
}

/** How Rachel sees a source: a short label, and the phrase in "Captured from ___". */
const SOURCE_COPY: Record<string, { label: string; phrase: string }> = {
  business_card: { label: "Business card", phrase: "your business card" },
  consultation: { label: "Consultation", phrase: "the consultation form" },
  job_watchlist: { label: "Job Alerts", phrase: "the Job Alerts form" },
};

/**
 * Both app inserts always set a source, but the column is nullable and this now
 * renders on EVERY row of /admin/leads, so a hand-written NULL row must not take
 * the whole list down. `Object.hasOwn` again: `SOURCE_COPY["toString"]` is a
 * function off the prototype, and `??` would not catch it.
 */
function copyFor(source: string | null | undefined): { label: string; phrase: string } {
  if (typeof source !== "string" || source.trim().length === 0) {
    return { label: "Unknown", phrase: "an unknown source" };
  }
  if (Object.hasOwn(SOURCE_COPY, source)) return SOURCE_COPY[source];
  const readable = source.replace(/_/g, " ");
  return { label: readable, phrase: readable };
}

/** Short label for a lead's source, e.g. "Business card". */
export function leadSourceLabel(source: string | null | undefined): string {
  return copyFor(source).label;
}

/** The phrase that follows "Captured from", e.g. "your business card". */
export function leadSourcePhrase(source: string | null | undefined): string {
  return copyFor(source).phrase;
}
