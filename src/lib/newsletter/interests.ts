// Newsletter interest taxonomy. Subscribers pick zero or more of these on
// signup; Rachel can target specific interest sets when scheduling an issue.
// Keep this list in sync with the targeting checkboxes in NewsletterIssueForm
// and the multi-select in NewsletterForm (variant="full").

export const NEWSLETTER_INTERESTS = [
  { slug: "leadership",        label: "Leadership" },
  { slug: "job-searching",     label: "Job Searching" },
  { slug: "resume-interview",  label: "Resume & Interview Tips" },
  { slug: "career-growth",     label: "Career Growth" },
  { slug: "motivation",        label: "Motivation & Accountability" },
  { slug: "hr-insights",       label: "HR Insights" },
  { slug: "workplace-growth",  label: "Workplace Growth" },
] as const;

export type NewsletterInterestSlug = (typeof NEWSLETTER_INTERESTS)[number]["slug"];

const SLUG_SET = new Set(NEWSLETTER_INTERESTS.map((i) => i.slug));

export function isValidInterestSlug(value: unknown): value is NewsletterInterestSlug {
  return typeof value === "string" && SLUG_SET.has(value as NewsletterInterestSlug);
}

export function sanitizeInterests(input: unknown): NewsletterInterestSlug[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<NewsletterInterestSlug>();
  for (const value of input) {
    if (isValidInterestSlug(value)) seen.add(value);
  }
  return Array.from(seen);
}

export function labelForInterest(slug: string): string {
  return NEWSLETTER_INTERESTS.find((i) => i.slug === slug)?.label ?? slug;
}
