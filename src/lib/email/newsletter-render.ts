// Server-side rendering of a newsletter issue → HTML email body.
//
// Output contains {{first_name}}, {{unsubscribe_url}}, and {{manage_url}}
// placeholders that the send pipeline substitutes per recipient.

import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";
import { newsletterRenderExtensions } from "@/lib/newsletter/extensions";
import { renderNewsletterShell } from "./newsletter-template";

export interface RenderIssueInput {
  subject: string;
  preheader: string;
  content: JSONContent;
  publicUrl?: string;
  businessAddress?: string;
}

export function renderIssueHTML(input: RenderIssueInput): string {
  const bodyHtml = input.content
    ? generateHTML(input.content, newsletterRenderExtensions)
    : "<p>(No content yet.)</p>";

  return renderNewsletterShell({
    subject: input.subject,
    preheader: input.preheader,
    bodyHtml,
    publicUrl: input.publicUrl ?? newsletterPublicUrl(),
    businessAddress: input.businessAddress ?? newsletterBusinessAddress(),
  });
}

// Plain-text fallback. Strips tags and squashes whitespace. Most clients
// ignore this in favor of HTML, but it helps deliverability with stricter
// spam filters and accessibility tools.
export function renderIssueText(input: RenderIssueInput): string {
  if (!input.content) return "";
  const html = generateHTML(input.content, newsletterRenderExtensions);
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h\d|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function newsletterPublicUrl(): string {
  return (
    process.env.NEWSLETTER_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://thryvegrowth.co"
  );
}

export function newsletterBusinessAddress(): string {
  return (
    process.env.NEWSLETTER_BUSINESS_ADDRESS ??
    "Thryve Growth Co. LLC · United States"
  );
}

export function buildUnsubscribeUrl(token: string): string {
  // User-facing pretty URL — shown in email footers.
  return `${newsletterPublicUrl()}/newsletter/unsubscribe/${encodeURIComponent(token)}`;
}

export function buildUnsubscribeApiUrl(token: string): string {
  // API URL — referenced in the List-Unsubscribe header so Gmail's native
  // one-click button (RFC 8058) can POST to it.
  return `${newsletterPublicUrl()}/api/newsletter/unsubscribe/${encodeURIComponent(token)}`;
}

export function buildManageUrl(token: string): string {
  return `${newsletterPublicUrl()}/newsletter/manage/${encodeURIComponent(token)}`;
}
