// Phase 4 — "Draft with ChatGPT" prompt library.
//
// Bring-your-own-ChatGPT: the app assembles a context-rich prompt that Rachel
// pastes into her ChatGPT, then pastes the reply back into the app. There is NO
// API call here — these are pure string builders. Each builder takes a typed
// context object and returns the prompt text. Keep this module free of React and
// server-only imports so it can run client-side AND in the unit test.

import { getSchemaForService } from "@/lib/intake/schemas";

const PERSONA =
  "You are an assistant to Rachel, an experienced HR consultant and career coach at Thryve Growth Co. " +
  "Write in her voice: warm, direct, encouraging, and practical — never fluffy or generic. " +
  "Use only the context provided; if something isn't given, don't invent it.";

const MAX_FIELD_CHARS = 2000;

function clip(s: string, max = MAX_FIELD_CHARS): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) + " …(truncated)" : t;
}

/** A labelled context line, omitted entirely when the value is empty. */
function line(label: string, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    const items = value.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
    if (items.length === 0) return "";
    return `- ${label}: ${items.map((v) => String(v).trim()).join(", ")}`;
  }
  const s = String(value).trim();
  if (!s) return "";
  return `- ${label}: ${clip(s)}`;
}

/** Join non-empty lines; return a placeholder when nothing is present. */
function block(lines: string[], emptyNote: string): string {
  const kept = lines.filter((l) => l.trim() !== "");
  return kept.length ? kept.join("\n") : emptyNote;
}

function isUploadedFile(v: unknown): v is { path: string; filename: string } {
  return !!v && typeof v === "object" && typeof (v as Record<string, unknown>).filename === "string";
}

/**
 * Render a service's intake responses as human-readable `Question: answer`
 * lines, using the same schema the intake UI uses. Skips empty answers; renders
 * files as their filename (never `[object Object]`); tolerates a missing schema.
 */
export function humanizeIntake(
  serviceKey: string | null | undefined,
  responses: Record<string, unknown> | null | undefined
): string {
  if (!responses) return "";
  const schema = getSchemaForService(serviceKey);
  const lines: string[] = [];

  const render = (value: unknown): string => {
    if (value === undefined || value === null) return "";
    if (isUploadedFile(value)) return value.filename;
    if (Array.isArray(value)) {
      const parts = value.map((v) => (isUploadedFile(v) ? v.filename : String(v).trim())).filter(Boolean);
      return parts.join(", ");
    }
    return String(value).trim();
  };

  if (schema) {
    for (const field of schema.fields) {
      const rendered = render(responses[field.id]);
      if (rendered) lines.push(`- ${field.label}: ${clip(rendered)}`);
    }
  } else {
    // No schema registered for this service — fall back to raw keys.
    for (const [key, value] of Object.entries(responses)) {
      const rendered = render(value);
      if (rendered) lines.push(`- ${key}: ${clip(rendered)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Parse ChatGPT's labelled reply into an ordered array aligned to `labels`.
 * Anchors on headers like `### SUMMARY` / `**SUMMARY**` / `SUMMARY:` on their
 * own line (case-insensitive). If NO header is found, the entire text goes to
 * the first label and the rest are empty (graceful fallback so a clumsy paste
 * still lands something).
 */
export function splitInOrder(text: string, labels: string[]): string[] {
  const result = labels.map(() => "");
  if (!text || labels.length === 0) return result;

  // Find each label's header position in the text.
  const found: { index: number; pos: number; headerLen: number }[] = [];
  labels.forEach((label, index) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^[ \\t]*#{0,6}[ \\t]*\\*{0,2}${escaped}\\*{0,2}[ \\t]*:?[ \\t]*$`, "im");
    const m = re.exec(text);
    if (m) found.push({ index, pos: m.index, headerLen: m[0].length });
  });

  if (found.length === 0) {
    result[0] = text.trim();
    return result;
  }

  // Sort headers by their position, then slice the body between consecutive headers.
  found.sort((a, b) => a.pos - b.pos);
  for (let i = 0; i < found.length; i++) {
    const start = found[i].pos + found[i].headerLen;
    const end = i + 1 < found.length ? found[i + 1].pos : text.length;
    result[found[i].index] = text.slice(start, end).trim();
  }
  return result;
}

// ─── Context interfaces ───────────────────────────────────────────────────────

export interface ClientProfileContext {
  current_position?: string | null;
  company?: string | null;
  industry?: string | null;
  years_experience?: string | null;
  primary_goal?: string | null;
  location?: string | null;
}

export interface SessionSummaryContext {
  serviceType: string;
  sessionType?: string | null;
  serviceKey?: string | null;
  sessionAt?: string | null;
  clientNotes?: string | null;
  adminNotes?: string | null;
  profile?: ClientProfileContext | null;
  intakeResponses?: Record<string, unknown> | null;
  recentNotes?: string[]; // prior admin_client_notes
}

export interface ResumeReviewContext {
  serviceKey?: string | null;
  profile?: ClientProfileContext | null;
  intakeResponses?: Record<string, unknown> | null;
}

export interface JobMatchContext {
  jobTitle?: string | null;
  company?: string | null;
  jobDescription?: string | null;
  targetRoles?: string[] | null;
  industries?: string[] | null;
  skills?: string[] | null;
  mustHaves?: string[] | null;
  preferencesNotes?: string | null;
}

export interface ProposalScopeContext {
  clientName?: string | null;
  title: string;
  serviceType?: string | null;
  summary?: string | null;
  amountLabel?: string | null;
  lead?: {
    notes?: string | null;
    target_role?: string | null;
    timeline?: string | null;
    current_position?: string | null;
    admin_notes?: string | null;
  } | null;
}

export interface MessageReplyContext {
  clientName: string;
  messages: { sender_role: "client" | "admin"; body: string; created_at?: string }[];
}

export interface LeadFollowupContext {
  fullName: string;
  targetRole?: string | null;
  currentPosition?: string | null;
  timeline?: string | null;
  notes?: string | null;
  source?: string | null;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

export function buildSessionSummaryPrompt(ctx: SessionSummaryContext): string {
  const profile = ctx.profile ?? {};
  const intake = humanizeIntake(ctx.serviceKey, ctx.intakeResponses);
  const context = block(
    [
      line("Service", ctx.serviceType),
      line("Session type", ctx.sessionType),
      line("Current role", profile.current_position),
      line("Industry", profile.industry),
      line("Years of experience", profile.years_experience),
      line("Client's primary goal", profile.primary_goal),
      line("What the client shared when booking", ctx.clientNotes),
      line("Rachel's notes from the session", ctx.adminNotes),
      ctx.recentNotes && ctx.recentNotes.length
        ? `- Earlier private notes:\n${ctx.recentNotes.slice(0, 5).map((n) => `   • ${clip(n, 500)}`).join("\n")}`
        : "",
      intake ? `\nIntake answers:\n${intake}` : "",
    ],
    "No additional context was recorded for this session — draft from the service type and general best practice, and keep it brief."
  );

  return `${PERSONA}

TASK: Draft a concise post-session summary and next steps for this coaching/consulting session, written TO the client (second person, "you"). The summary should reflect what was likely covered and reinforce momentum; next steps should be 2–4 concrete, specific actions.

CONTEXT:
${context}

FORMAT your reply with these exact headers, each on its own line:
### SUMMARY
<2–4 sentence recap, warm and specific>
### NEXT STEPS
<2–4 bullet points, each an action the client can take>`;
}

export function buildPrepBriefPrompt(ctx: SessionSummaryContext): string {
  const profile = ctx.profile ?? {};
  const intake = humanizeIntake(ctx.serviceKey, ctx.intakeResponses);
  const context = block(
    [
      line("Service", ctx.serviceType),
      line("Session type", ctx.sessionType),
      line("Current role", profile.current_position),
      line("Industry", profile.industry),
      line("Years of experience", profile.years_experience),
      line("Client's primary goal", profile.primary_goal),
      line("What the client shared when booking", ctx.clientNotes),
      ctx.recentNotes && ctx.recentNotes.length
        ? `- Notes from past sessions:\n${ctx.recentNotes.slice(0, 5).map((n) => `   • ${clip(n, 500)}`).join("\n")}`
        : "",
      intake ? `\nIntake answers:\n${intake}` : "",
    ],
    "Little context is on file — give Rachel a short brief based on the service type and smart discovery questions to open with."
  );

  return `${PERSONA}

TASK: Write a tight pre-session prep brief FOR RACHEL (not the client) so she can walk in prepared. Cover: who this person is in one line, where they likely are/what they want, 3–5 focus areas or questions to explore, and one thing to be mindful of.

CONTEXT:
${context}

FORMAT as a short brief with clear headers (Who they are / Likely focus / Questions to ask / Watch for). Keep it scannable — Rachel will read it in under a minute.`;
}

export function buildResumeReviewPrompt(ctx: ResumeReviewContext): string {
  const profile = ctx.profile ?? {};
  const intake = humanizeIntake(ctx.serviceKey, ctx.intakeResponses);
  const context = block(
    [
      line("Current role", profile.current_position),
      line("Industry", profile.industry),
      line("Years of experience", profile.years_experience),
      line("Primary goal", profile.primary_goal),
      intake ? `\nIntake answers:\n${intake}` : "",
    ],
    "No intake on file — review against general best practice for the target role."
  );

  return `${PERSONA}

TASK: Review the client's resume (attach/paste it into this chat alongside this prompt). Give specific, actionable feedback Rachel can refine before sharing. Cover: overall impression, strongest elements, the top 5 concrete improvements (with rewrite examples where useful), ATS/keyword gaps for the target role, and formatting notes.

CLIENT CONTEXT:
${context}

IMPORTANT: Base the review on the actual resume content. Be specific and quote weak lines you'd rewrite. Avoid generic advice. Format with clear headers and bullet points.`;
}

export function buildJobMatchPrompt(ctx: JobMatchContext): string {
  const job = block(
    [line("Title", ctx.jobTitle), line("Company", ctx.company), line("Description", ctx.jobDescription)],
    "No job description was provided — base the match on the title and the client's profile, and note that more detail would help."
  );
  const client = block(
    [
      line("Target roles", ctx.targetRoles),
      line("Industries", ctx.industries),
      line("Key skills", ctx.skills),
      line("Must-haves", ctx.mustHaves),
      line("Preferences / goals", ctx.preferencesNotes),
    ],
    "Limited profile on file — keep the match reasoning general."
  );

  return `${PERSONA}

TASK: Rachel is curating this job for a client. Draft (1) a short, compelling "why this matches you" written TO the client, and (2) a concrete recommended next action (e.g. tailor X in the resume, apply by Y, prep Z talking point). Be specific to THIS job and THIS client.

JOB:
${job}

CLIENT PROFILE:
${client}

FORMAT your reply with these exact headers, each on its own line:
### MATCH REASON
<2–4 sentences, warm and specific, second person>
### RECOMMENDED ACTION
<1–2 sentences, a concrete next step>`;
}

export function buildCoverLetterPrompt(ctx: JobMatchContext): string {
  const job = block(
    [line("Title", ctx.jobTitle), line("Company", ctx.company), line("Description", ctx.jobDescription)],
    "No job description provided — write a strong general cover letter for the title and tailor placeholders [in brackets]."
  );
  const client = block(
    [
      line("Target roles", ctx.targetRoles),
      line("Industries", ctx.industries),
      line("Key skills", ctx.skills),
      line("Preferences / goals", ctx.preferencesNotes),
    ],
    "Limited profile on file — leave [bracketed placeholders] for the client to fill."
  );

  return `${PERSONA}

TASK: Draft a tailored, one-page cover letter for the client applying to this job. Confident but genuine, specific to the company and role, leading with fit. Use [bracketed placeholders] for anything you don't know (specific achievements, dates). Rachel will refine it before sharing.

JOB:
${job}

CLIENT PROFILE:
${client}

Return just the cover letter text, ready to edit.`;
}

export function buildProposalScopePrompt(ctx: ProposalScopeContext): string {
  const lead = ctx.lead ?? {};
  const context = block(
    [
      line("Client", ctx.clientName),
      line("Proposal title", ctx.title),
      line("Service", ctx.serviceType),
      line("Investment", ctx.amountLabel),
      line("One-line summary", ctx.summary),
      line("Their current role", lead.current_position),
      line("What they're looking for (target)", lead.target_role),
      line("Timeline", lead.timeline),
      line("What they shared", lead.notes),
      line("Rachel's internal notes", lead.admin_notes),
    ],
    "Limited detail on file — draft a solid default scope for the service and leave [bracketed placeholders] where specifics are needed."
  );

  return `${PERSONA}

TASK: Draft the SCOPE & TERMS section of a consulting proposal the client will read and accept. Cover: a brief overview, specific deliverables (bulleted), a phased timeline, what's included vs. not, and engagement terms. Professional and clear; use [bracketed placeholders] for anything unknown.

CONTEXT:
${context}

Return clean, well-structured text (headings + bullets) Rachel can paste into the proposal editor and refine.`;
}

export function buildMessageReplyPrompt(ctx: MessageReplyContext): string {
  const recent = ctx.messages.slice(-12);
  const thread = recent.length
    ? recent
        .map((m) => `${m.sender_role === "admin" ? "Rachel" : ctx.clientName || "Client"}: ${clip(m.body, 1000)}`)
        .join("\n")
    : "(no prior messages)";

  return `${PERSONA}

TASK: Draft Rachel's reply to the most recent message from ${ctx.clientName || "the client"} in the conversation below. Match her warm, direct tone. Be helpful and concrete; keep it appropriately brief. If a clear answer isn't possible from the context, ask a focused clarifying question.

CONVERSATION (oldest to newest):
${thread}

Return just the reply text Rachel can edit and send.`;
}

export function buildLeadFollowupPrompt(ctx: LeadFollowupContext): string {
  const context = block(
    [
      line("Name", ctx.fullName),
      line("Current role", ctx.currentPosition),
      line("What they want (target)", ctx.targetRole),
      line("Timeline", ctx.timeline),
      line("How they found us", ctx.source),
      line("What they shared", ctx.notes),
    ],
    "Limited detail on file — write a warm, general follow-up that invites a conversation."
  );

  return `${PERSONA}

TASK: Draft a warm, personal follow-up email to this prospective client who reached out (a consultation/inquiry). Reference what they shared, show you understand their situation, and invite a next step (a quick call or booking a session). Genuine, not salesy. Keep it short.

LEAD:
${context}

Return just the email text (a subject line on the first line, then the body) for Rachel to edit and send from her own inbox.`;
}
