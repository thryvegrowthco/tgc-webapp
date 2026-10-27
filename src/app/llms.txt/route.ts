import { SITE_URL } from "@/lib/seo/og";
import {
  SOCIAL_LINKS,
  RACHEL_LINKEDIN,
  GOOGLE_BUSINESS_PROFILE_URL,
} from "@/lib/site/social";

export const dynamic = "force-static";

// Prices here mirror src/lib/stripe/products.ts and the /investment page. If a
// price changes there, update it here too (kept inline rather than templated
// because the copy wraps each price in a sentence). Source of truth: /investment.
const profiles = [`- LinkedIn (company): ${SOCIAL_LINKS.linkedin}`];
if (RACHEL_LINKEDIN) {
  profiles.push(`- LinkedIn (Rachel Dietz, PHR): ${RACHEL_LINKEDIN}`);
}
profiles.push(`- Instagram: ${SOCIAL_LINKS.instagram}`);
if (GOOGLE_BUSINESS_PROFILE_URL) {
  profiles.push(`- Google Business Profile: ${GOOGLE_BUSINESS_PROFILE_URL}`);
}

const BODY = `# Thryve Growth Co.

> Thryve Growth Co. (Thryve Growth Co. LLC) is an HR consulting and career coaching practice founded by Rachel Dietz, PHR, based in Sun Prairie, Wisconsin, USA. It serves individuals and small to mid-size organizations nationwide through virtual sessions. Tagline: "Clarity. Accountability. Real Growth."

Founder: Rachel Dietz, PHR (Professional in Human Resources). 10+ years in human resources, including public-sector HR, from assistant-level roles to senior HR leadership. Rachel personally delivers all coaching, resume, interview, and consulting work.
Contact: hello@thryvegrowth.co
Service area: Virtual, United States. Based in Sun Prairie, Wisconsin (Madison area).
Free consultation: 30-minute video call, request at ${SITE_URL}/consultation (reply within 1 to 2 business days). New clients start here; paid sessions are booked by invitation after the consultation.

## Services for individuals
- [Career and Leadership Coaching](${SITE_URL}/services/coaching): 1:1 virtual coaching for career transitions, new managers, and feeling stuck. $125 per 60-minute session, or $425 for 4 sessions.
- [Interview Preparation](${SITE_URL}/services/interview-prep): mock interviews, STAR method coaching, and honest feedback. $100 per session, or $250 for 3 sessions.
- [Resume and Career Materials](${SITE_URL}/services/resume-materials): resume review and edits $75; full resume rewrite $150 (30-minute intake call, ATS-friendly format, two revision rounds, Word and PDF, delivered within 5 business days of the intake call). LinkedIn, cover letter, and bio add-ons quoted on a call.
- [Job Alerts and Watchlists](${SITE_URL}/services/job-alerts): job matches curated by Rachel plus a filtered live job feed in a client dashboard. $15 per month, cancel anytime.

## Services for organizations
- [HR Consulting and Team Development](${SITE_URL}/services/hr-consulting): HR audits, role clarity, performance management, hiring process, onboarding, manager coaching, policy review. $125 per hour; projects from $500.
- [Culture and Engagement Consulting](${SITE_URL}/services/culture-engagement): culture assessment, engagement strategy, values alignment. Projects from $750.
- [Recruitment and Candidate Screening](${SITE_URL}/services/recruitment-screening): resume screening, phone screens, interview questions, candidate recommendations. Custom quote.

## Key pages
- [Pricing](${SITE_URL}/investment)
- [Packages](${SITE_URL}/packages)
- [About Rachel](${SITE_URL}/about)
- [FAQ](${SITE_URL}/faq)
- [Testimonials](${SITE_URL}/testimonials)
- [Free Career Reset Workbook](${SITE_URL}/career-reset-workbook)
- [Resources](${SITE_URL}/resources)
- [Blog](${SITE_URL}/blog)
- [Contact](${SITE_URL}/contact)

## Policies
- Cancellation, refund, and package terms: see the Terms of Service and the Service Agreement below.
- [Terms of Service](${SITE_URL}/terms), [Privacy Policy](${SITE_URL}/privacy), [Service Agreement](${SITE_URL}/legal/service-agreement)

## Profiles
${profiles.join("\n")}
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
