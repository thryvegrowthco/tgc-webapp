// Stripe product/price configuration for all Thryve Growth Co. services.
// Replace price IDs with your actual Stripe price IDs after creating products in the dashboard.

export type ServiceKey =
  | "coaching_single"
  | "coaching_package"
  | "interview_single"
  | "interview_package"
  | "resume_review"
  | "resume_rewrite"
  | "job_alerts_monthly"
  | "hr_consulting_hourly"
  | "hr_consulting_project"
  | "culture_engagement";

export interface ServiceProduct {
  name: string;
  description: string;
  amountCents: number;
  stripePriceId: string;
  mode: "payment" | "subscription";
  serviceType: string;
}

export const SERVICES: Record<ServiceKey, ServiceProduct> = {
  coaching_single: {
    name: "Career & Leadership Coaching: Single Session",
    description: "One 60-minute 1:1 coaching session with Rachel.",
    amountCents: 12500,
    stripePriceId: process.env.STRIPE_PRICE_COACHING_SINGLE ?? "price_coaching_single",
    mode: "payment",
    serviceType: "Career & Leadership Coaching",
  },
  coaching_package: {
    name: "Career & Leadership Coaching: 4-Session Plan",
    description: "Four 60-minute 1:1 coaching sessions with Rachel.",
    amountCents: 42500,
    stripePriceId: process.env.STRIPE_PRICE_COACHING_PACKAGE ?? "price_coaching_package",
    mode: "payment",
    serviceType: "Career & Leadership Coaching",
  },
  interview_single: {
    name: "Interview Preparation: Single Session",
    description: "One focused interview prep session with Rachel.",
    amountCents: 10000,
    stripePriceId: process.env.STRIPE_PRICE_INTERVIEW_SINGLE ?? "price_interview_single",
    mode: "payment",
    serviceType: "Interview Preparation",
  },
  interview_package: {
    name: "Interview Preparation: 3-Session Package",
    description: "Three interview prep sessions covering strategy and mock interviews.",
    amountCents: 25000,
    stripePriceId: process.env.STRIPE_PRICE_INTERVIEW_PACKAGE ?? "price_interview_package",
    mode: "payment",
    serviceType: "Interview Preparation",
  },
  resume_review: {
    name: "Resume Review + Edits",
    description: "Written feedback and minor revisions on your existing resume.",
    amountCents: 7500,
    stripePriceId: process.env.STRIPE_PRICE_RESUME_REVIEW ?? "price_resume_review",
    mode: "payment",
    serviceType: "Resume & Career Materials",
  },
  resume_rewrite: {
    name: "Full Resume Rewrite",
    description: "Complete resume rewrite with an intake call and two revision rounds.",
    amountCents: 15000,
    stripePriceId: process.env.STRIPE_PRICE_RESUME_REWRITE ?? "price_resume_rewrite",
    mode: "payment",
    serviceType: "Resume & Career Materials",
  },
  job_alerts_monthly: {
    name: "Job Alerts & Watchlists: Monthly Support",
    description: "Curated job matches delivered to your dashboard. Cancel anytime.",
    amountCents: 1500,
    stripePriceId: process.env.STRIPE_PRICE_JOB_ALERTS ?? "price_job_alerts",
    mode: "subscription",
    serviceType: "Job Alerts & Watchlists",
  },
  hr_consulting_hourly: {
    name: "HR Consulting: Hourly Support",
    description: "Hourly HR consulting engagement.",
    amountCents: 12500,
    stripePriceId: process.env.STRIPE_PRICE_HR_HOURLY ?? "price_hr_hourly",
    mode: "payment",
    serviceType: "HR Consulting & Team Development",
  },
  hr_consulting_project: {
    name: "HR Consulting: Project-Based Work",
    description: "Project-based HR consulting engagement. Scope agreed upfront.",
    amountCents: 50000,
    stripePriceId: process.env.STRIPE_PRICE_HR_PROJECT ?? "price_hr_project",
    mode: "payment",
    serviceType: "HR Consulting & Team Development",
  },
  culture_engagement: {
    name: "Culture & Engagement Consulting",
    description: "Project-based culture and engagement consulting.",
    amountCents: 75000,
    stripePriceId: process.env.STRIPE_PRICE_CULTURE ?? "price_culture",
    mode: "payment",
    serviceType: "Culture & Engagement Consulting",
  },
};

// Services that map to a bookable slot (require calendar selection)
export const BOOKABLE_SERVICES: ServiceKey[] = [
  "coaching_single",
  "coaching_package",
  "interview_single",
  "interview_package",
];

// Label → ServiceKey mapping for the booking form dropdown
export const SERVICE_SELECT_OPTIONS = [
  { value: "coaching_single", label: "Career & Leadership Coaching: Single Session ($125)" },
  { value: "coaching_package", label: "Career & Leadership Coaching: 4-Session Plan ($425)" },
  { value: "interview_single", label: "Interview Preparation: Single Session ($100)" },
  { value: "interview_package", label: "Interview Preparation: 3-Session Package ($250)" },
  { value: "resume_review", label: "Resume Review + Edits ($75)" },
  { value: "resume_rewrite", label: "Full Resume Rewrite ($150)" },
  { value: "job_alerts_monthly", label: "Job Alerts & Watchlists ($15/month)" },
  { value: "hr_consulting_hourly", label: "HR Consulting: Hourly Support ($125/hr)" },
  { value: "hr_consulting_project", label: "HR Consulting: Project-Based ($500+)" },
  { value: "culture_engagement", label: "Culture & Engagement Consulting ($750+)" },
];
