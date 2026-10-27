import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo/og";

const BASE_URL = SITE_URL;

// Fixed lastModified dates so the sitemap does not claim every page changed on
// every build. All marketing pages were updated in the fix/audit-batch-1 audit,
// so they share that date; the Service Agreement uses its own effective date.
const UPDATED = new Date("2026-10-26");
const SERVICE_AGREEMENT_EFFECTIVE = new Date("2026-06-03");

// Static marketing pages with their priority/change frequency
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: UPDATED, changeFrequency: "monthly", priority: 1 },
  { url: `${BASE_URL}/about`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/consultation`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/services`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/services/coaching`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/services/hr-consulting`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/services/culture-engagement`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/services/interview-prep`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/services/resume-materials`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/services/recruitment-screening`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/services/job-alerts`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/career-reset-workbook`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/investment`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/packages`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/resources`, lastModified: UPDATED, changeFrequency: "weekly", priority: 0.7 },
  { url: `${BASE_URL}/faq`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/newsletter`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/blog`, lastModified: UPDATED, changeFrequency: "weekly", priority: 0.8 },
  { url: `${BASE_URL}/book`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.3 },
  { url: `${BASE_URL}/contact`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/testimonials`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/privacy`, lastModified: UPDATED, changeFrequency: "yearly", priority: 0.2 },
  { url: `${BASE_URL}/terms`, lastModified: UPDATED, changeFrequency: "yearly", priority: 0.2 },
  { url: `${BASE_URL}/legal/service-agreement`, lastModified: SERVICE_AGREEMENT_EFFECTIVE, changeFrequency: "yearly", priority: 0.2 },
  // /card, /login, /signup, /reset-password, token pages, and /book/success are
  // intentionally excluded (noindex or not meant to be crawled).
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, updated_at")
    .eq("published", true);

  const blogRoutes: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...STATIC_ROUTES, ...blogRoutes];
}
