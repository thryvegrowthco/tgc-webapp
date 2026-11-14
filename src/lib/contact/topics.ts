// Topics a service page can hand to the contact form.
//
// A service button links to /contact?topic=<token>#message. The token only picks
// copy from the table below: nothing from the query string is ever echoed into
// the page, so an unknown or hostile value simply renders the plain contact form.
//
// Adding a topic is one entry in CONTACT_TOPICS. The form still posts the same
// five fields to /api/contact, so the topic reaches Rachel as the subject line.

export interface ContactTopic {
  /** Heading above the form, in place of "Send a message". */
  heading: string;
  /** One or two sentences under the heading. */
  intro: string;
  /** Prefilled subject line. The visitor can still edit it. */
  subject: string;
  /** Label and placeholder for the message box. */
  messageLabel: string;
  messagePlaceholder: string;
  /** Helper text under the message box. */
  messageHint?: string;
}

const CONTACT_TOPICS = {
  "hr-consult": {
    heading: "Request an HR Consult",
    intro:
      "The Small Business HR Consult is $150 for a 60-minute virtual session, including a short intake and a written recap. Tell me briefly what's going on and I'll reply within 1 to 2 business days to get it scheduled.",
    subject: "Small Business HR Consult",
    messageLabel: "What would you like to work through?",
    messagePlaceholder: "A few sentences about the situation is plenty.",
  },
  "workplace-investigation": {
    heading: "Inquire About a Workplace Investigation",
    intro:
      "Share a brief overview of what you need looked into. I'll reply within 1 to 2 business days, and you'll receive a written scope and cost estimate before work begins.",
    subject: "Workplace investigation inquiry",
    messageLabel: "Brief overview",
    messagePlaceholder:
      "For example: the general type of concern, the size of your organization, and your timeline.",
    messageHint:
      "A brief overview is all I need for now. You're welcome to share sensitive details with me directly when I follow up.",
  },
} as const satisfies Record<string, ContactTopic>;

export type ContactTopicToken = keyof typeof CONTACT_TOPICS;

/**
 * The topic for a `?topic=` value when it is one of ours, else null.
 *
 * `Object.hasOwn`, never `in`: `"toString" in CONTACT_TOPICS` is true and would
 * hand back a function. A repeated param (`?topic=a&topic=b`) reaches Next as an
 * array, and the typeof guard turns it away. Same rules as entryToken() in
 * src/lib/leads/source.ts.
 */
export function contactTopic(value: unknown): ContactTopic | null {
  return typeof value === "string" && Object.hasOwn(CONTACT_TOPICS, value)
    ? CONTACT_TOPICS[value as ContactTopicToken]
    : null;
}

/** Link to the contact form for a topic, scrolled to the form itself. */
export function contactTopicHref(token: ContactTopicToken): string {
  return `/contact?topic=${token}#message`;
}
