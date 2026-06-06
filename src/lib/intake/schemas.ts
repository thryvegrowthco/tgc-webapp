// Service-specific intake form schemas.
//
// Single source of truth: the renderer (`IntakeFormRenderer`), the read-only
// admin view, and the submit action all read these schemas. Add or rename a
// question in one place and it propagates everywhere.
//
// Job Alerts subscription (`job_alerts_monthly`) is intentionally absent —
// the "intake" for that service is the existing /dashboard/watchlist/setup
// page which writes to `watchlist_profiles`. The session workspace for Job
// Alerts redirects there.

import type { ServiceKey } from "@/lib/stripe/products";

export type FieldType =
  | "short"        // single-line text
  | "long"         // textarea
  | "select"       // dropdown
  | "multiselect"  // multi-select chips
  | "date"         // date picker
  | "file"         // file upload (to client-uploads bucket)
  | "url";         // url input

export interface IntakeField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: string[];          // for select / multiselect
  accept?: string[];           // MIME types for file
  multiple?: boolean;          // file: allow multiple uploads
}

export interface IntakeSchema {
  title: string;
  subtitle?: string;
  fields: IntakeField[];
}

const SUPPORT_STYLES = ["Direct and challenging", "Encouraging and warm", "Reflective and probing"];
const URGENCY_LEVELS = ["This week", "This month", "This quarter", "Exploring"];
const INTERVIEW_FORMATS = ["Phone", "Video", "Onsite", "Panel", "Multiple rounds"];
const TARGET_INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Government / Public sector",
  "Consulting", "Marketing / Communications", "Non-profit", "Retail / E-commerce",
  "Manufacturing", "Energy / Utilities", "Other",
];

const DOC_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ─── Schema definitions ──────────────────────────────────────────────────────

const COACHING_SCHEMA: IntakeSchema = {
  title: "Coaching intake",
  subtitle: "A few questions so I can prepare for our session.",
  fields: [
    {
      id: "hopes_goals",
      label: "What are you hoping to work through?",
      type: "long",
      required: true,
      help: "It's okay if it's still fuzzy.",
    },
    {
      id: "feeling_stuck",
      label: "What feels stuck or unclear right now?",
      type: "long",
      required: true,
    },
    {
      id: "success_criteria",
      label: "What would make this session feel successful?",
      type: "long",
      required: true,
    },
    {
      id: "support_style",
      label: "What support style works best for you?",
      type: "select",
      options: SUPPORT_STYLES,
      required: true,
    },
    {
      id: "context",
      label: "Any context I should know before the session?",
      type: "long",
      placeholder: "Recent changes, relevant background, anything off-limits.",
    },
  ],
};

const RESUME_REVIEW_SCHEMA: IntakeSchema = {
  title: "Resume review intake",
  subtitle: "Share what you've got and what you're going for.",
  fields: [
    { id: "target_role", label: "Target role", type: "short", required: true, placeholder: "e.g., Senior Product Manager" },
    { id: "job_posting_url", label: "Job posting URL (if applying for something specific)", type: "url" },
    { id: "resume_upload", label: "Current resume", type: "file", accept: DOC_ACCEPT, help: "PDF or Word. If you don't have one, outline your job history below." },
    { id: "cover_letter_upload", label: "Current cover letter (optional)", type: "file", accept: DOC_ACCEPT },
    { id: "career_goals", label: "Career goals", type: "long", required: true, help: "Where are you trying to go in the next 1–3 years?" },
    { id: "accomplishments", label: "Key accomplishments", type: "long", required: true, help: "Quantify whenever possible." },
    { id: "target_industries", label: "Target industries", type: "multiselect", options: TARGET_INDUSTRIES },
    { id: "deadline", label: "Any deadlines?", type: "date" },
    { id: "concerns", label: "Specific concerns with your current resume", type: "long" },
  ],
};

const RESUME_REWRITE_SCHEMA: IntakeSchema = {
  ...RESUME_REVIEW_SCHEMA,
  title: "Resume rewrite intake",
  subtitle: "I'll use this to draft your new resume — please be thorough.",
  fields: RESUME_REVIEW_SCHEMA.fields.map((field) =>
    field.id === "resume_upload" ? { ...field, required: true } : field
  ),
};

const INTERVIEW_PREP_SCHEMA: IntakeSchema = {
  title: "Interview prep intake",
  subtitle: "The more I know going in, the more we can practice in our session.",
  fields: [
    { id: "job_posting", label: "Job posting (paste the description)", type: "long", required: true },
    { id: "interview_date", label: "Interview date", type: "date", required: true },
    { id: "format", label: "Interview format", type: "select", options: INTERVIEW_FORMATS, required: true },
    { id: "role_company", label: "Role and company", type: "short", required: true, placeholder: "Senior PM at Acme Co." },
    { id: "confidence_areas", label: "Where are you feeling confident?", type: "long", required: true },
    { id: "nervous_areas", label: "Where are you feeling nervous?", type: "long", required: true },
    { id: "questions_to_practice", label: "Specific questions you want to practice", type: "long" },
    { id: "resume_upload", label: "Resume", type: "file", accept: DOC_ACCEPT, required: true },
  ],
};

const HR_CONSULTING_SCHEMA: IntakeSchema = {
  title: "HR consulting intake",
  subtitle: "Share the situation — I'll come prepared to help.",
  fields: [
    { id: "org_name", label: "Organization name", type: "short", required: true },
    { id: "main_challenge", label: "Main challenge", type: "long", required: true },
    { id: "urgency", label: "Urgency level", type: "select", options: URGENCY_LEVELS, required: true },
    { id: "team_size", label: "Team size", type: "short", placeholder: "e.g., 25 employees" },
    { id: "process_concern", label: "Current process or policy concern", type: "long" },
    { id: "desired_outcome", label: "Desired outcome", type: "long", required: true },
    { id: "documents", label: "Documents to review (optional)", type: "file", accept: DOC_ACCEPT, multiple: true, help: "Org charts, policy docs, anything relevant." },
  ],
};

const CULTURE_SCHEMA: IntakeSchema = {
  ...HR_CONSULTING_SCHEMA,
  title: "Culture & engagement intake",
  subtitle: "Help me understand the current culture and where you want to take it.",
};

// Recruitment & Candidate Screening intake. Exported but NOT registered in
// INTAKE_SCHEMAS — there's no Stripe product / ServiceKey for recruitment yet
// (it's quote-only via /consultation), so no booking can trigger the form.
// When Stripe products are added later, register the schema by inserting:
//   recruitment_hourly: RECRUITMENT_SCHEMA,
//   recruitment_project: RECRUITMENT_SCHEMA,
// into the INTAKE_SCHEMAS map below.
export const RECRUITMENT_SCHEMA: IntakeSchema = {
  title: "Recruitment intake",
  subtitle: "Tell me about the role and your hiring needs.",
  fields: [
    { id: "org_name", label: "Organization name", type: "short", required: true },
    { id: "role_title", label: "Role you're hiring for", type: "short", required: true },
    { id: "openings_count", label: "Number of openings", type: "short", placeholder: "e.g., 1, 2-3, ongoing" },
    { id: "hiring_timeline", label: "Hiring timeline", type: "short", placeholder: "e.g., 30 days, ASAP, Q3", required: true },
    { id: "compensation_range", label: "Compensation range (optional)", type: "short" },
    { id: "key_qualifications", label: "Key qualifications / must-haves", type: "long", required: true },
    { id: "current_process", label: "Current screening or hiring process", type: "long" },
    { id: "support_needed", label: "Where do you need the most support?", type: "long", required: true },
    { id: "documents", label: "Job description or related docs (optional)", type: "file", accept: DOC_ACCEPT, multiple: true, help: "Job description, screening rubric, anything relevant." },
  ],
};

// ─── Map service keys to schemas ─────────────────────────────────────────────

export const INTAKE_SCHEMAS: Partial<Record<ServiceKey, IntakeSchema>> = {
  coaching_single: COACHING_SCHEMA,
  coaching_package: COACHING_SCHEMA,
  interview_single: INTERVIEW_PREP_SCHEMA,
  interview_package: INTERVIEW_PREP_SCHEMA,
  resume_review: RESUME_REVIEW_SCHEMA,
  resume_rewrite: RESUME_REWRITE_SCHEMA,
  hr_consulting_hourly: HR_CONSULTING_SCHEMA,
  hr_consulting_project: HR_CONSULTING_SCHEMA,
  culture_engagement: CULTURE_SCHEMA,
  // job_alerts_monthly: redirects to /dashboard/watchlist/setup
};

export function getSchemaForService(serviceKey: string | null | undefined): IntakeSchema | null {
  if (!serviceKey) return null;
  return INTAKE_SCHEMAS[serviceKey as ServiceKey] ?? null;
}

/**
 * Validate a responses object against a schema. Returns an error message for
 * the first invalid required field, or null if everything checks out.
 */
export function validateResponses(
  schema: IntakeSchema,
  responses: Record<string, unknown>
): string | null {
  for (const field of schema.fields) {
    if (!field.required) continue;
    const value = responses[field.id];
    if (value === undefined || value === null || value === "") {
      return `Please answer: ${field.label}`;
    }
    if (Array.isArray(value) && value.length === 0) {
      return `Please answer: ${field.label}`;
    }
  }
  return null;
}
