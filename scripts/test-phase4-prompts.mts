// Phase 4 — pure unit tests for the prompt library. NO DB, NO env, NO network.
// Run: npx tsx scripts/test-phase4-prompts.mts
import {
  humanizeIntake,
  splitInOrder,
  buildSessionSummaryPrompt,
  buildPrepBriefPrompt,
  buildResumeReviewPrompt,
  buildJobMatchPrompt,
  buildCoverLetterPrompt,
  buildProposalScopePrompt,
  buildMessageReplyPrompt,
  buildLeadFollowupPrompt,
} from "@/lib/ai/prompts";

let pass = 0,
  fail = 0;
const check = (label: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra !== undefined ? `  — ${JSON.stringify(extra)}` : ""}`);
  if (ok) pass++;
  else fail++;
};
const clean = (s: string) => !/undefined|\[object Object\]|\bnull\b/.test(s) && s.trim().length > 0;

// ── splitInOrder ──────────────────────────────────────────────────────────────
{
  const [s, n] = splitInOrder("### SUMMARY\nWe covered goals.\n### NEXT STEPS\n- Do the thing", ["SUMMARY", "NEXT STEPS"]);
  check("splitInOrder: clean split", s === "We covered goals." && n === "- Do the thing", { s, n });

  const [s2, n2] = splitInOrder("## summary\nlower\n**Next Steps**\nbold header", ["SUMMARY", "NEXT STEPS"]);
  check("splitInOrder: case-insensitive / ## / **bold** headers", s2 === "lower" && n2 === "bold header", { s2, n2 });

  const [s3, n3] = splitInOrder("Just a blob with no headers at all.", ["SUMMARY", "NEXT STEPS"]);
  check("splitInOrder: no headers → all to first label", s3 === "Just a blob with no headers at all." && n3 === "", { s3, n3 });

  const [s4, n4] = splitInOrder("### SUMMARY\nonly summary present", ["SUMMARY", "NEXT STEPS"]);
  check("splitInOrder: missing label → empty", s4 === "only summary present" && n4 === "", { s4, n4 });

  const [s5, n5] = splitInOrder("### SUMMARY\n### NEXT STEPS\nhas next only", ["SUMMARY", "NEXT STEPS"]);
  check("splitInOrder: empty body for a header", s5 === "" && n5 === "has next only", { s5, n5 });

  const [r, a] = splitInOrder("### RECOMMENDED ACTION\ndo X\n### MATCH REASON\ngreat fit", ["MATCH REASON", "RECOMMENDED ACTION"]);
  check("splitInOrder: headers out of order are aligned to labels", r === "great fit" && a === "do X", { r, a });
}

// ── humanizeIntake ────────────────────────────────────────────────────────────
{
  // coaching_single is a registered schema; use generic keys it won't have → falls to raw-key path only if no schema.
  const raw = humanizeIntake("totally_unknown_service", { foo: "bar", arr: ["a", "b"], empty: "", file: { path: "p", filename: "resume.pdf" } });
  check("humanizeIntake: no schema → raw keys, files as filename, skips empty",
    raw.includes("foo: bar") && raw.includes("arr: a, b") && raw.includes("file: resume.pdf") && !raw.includes("empty:"), raw);

  const none = humanizeIntake(null, null);
  check("humanizeIntake: null responses → empty string", none === "");

  const withSchema = humanizeIntake("coaching_single", { someKnownKey: "x" });
  check("humanizeIntake: registered schema runs without throwing", typeof withSchema === "string");
}

// ── builders: rich context includes key tokens + format headers ──────────────
{
  const summary = buildSessionSummaryPrompt({
    serviceType: "Career & Leadership Coaching",
    serviceKey: "coaching_single",
    adminNotes: "Talked through the promotion ask.",
    profile: { current_position: "Ops Manager", primary_goal: "Get to director" },
    recentNotes: ["Prior: clarified values"],
  });
  check("session summary: includes context + ### headers",
    summary.includes("Career & Leadership Coaching") && summary.includes("Ops Manager") && summary.includes("### SUMMARY") && summary.includes("### NEXT STEPS"));

  const prep = buildPrepBriefPrompt({ serviceType: "Interview Prep", profile: { primary_goal: "Pass final round" } });
  check("prep brief: includes goal + is for Rachel", prep.includes("Pass final round") && /FOR RACHEL/i.test(prep));

  const resume = buildResumeReviewPrompt({ serviceKey: "resume_review", profile: { current_position: "Analyst", years_experience: "6-10" } });
  check("resume review: includes role + asks for the actual resume", resume.includes("Analyst") && /resume/i.test(resume));

  const match = buildJobMatchPrompt({
    jobTitle: "Senior PM", company: "Acme", jobDescription: "Lead product",
    targetRoles: ["Product Manager"], mustHaves: ["Remote"],
  });
  check("job match: includes job + profile + ### headers",
    match.includes("Senior PM") && match.includes("Acme") && match.includes("Product Manager") && match.includes("Remote") && match.includes("### MATCH REASON") && match.includes("### RECOMMENDED ACTION"));

  const cover = buildCoverLetterPrompt({ jobTitle: "Designer", company: "Studio", skills: ["Figma"] });
  check("cover letter: includes job + skills", cover.includes("Designer") && cover.includes("Studio") && cover.includes("Figma"));

  const proposal = buildProposalScopePrompt({
    title: "HR Policy Audit", clientName: "Jordan", serviceType: "HR Consulting", amountLabel: "$2,500",
    lead: { notes: "22 employees, no handbook", target_role: null, timeline: "This quarter" },
  });
  check("proposal scope: includes title + client + service + lead notes",
    proposal.includes("HR Policy Audit") && proposal.includes("Jordan") && proposal.includes("HR Consulting") && proposal.includes("22 employees"));

  const reply = buildMessageReplyPrompt({
    clientName: "Sam",
    messages: [
      { sender_role: "client", body: "Can we move our session?" },
      { sender_role: "admin", body: "Sure!" },
      { sender_role: "client", body: "Thursday works." },
    ],
  });
  check("message reply: includes client name + thread", reply.includes("Sam") && reply.includes("Thursday works"));

  const lead = buildLeadFollowupPrompt({ fullName: "Pat Lee", targetRole: "Director of People", timeline: "ASAP", notes: "Scaling team fast" });
  check("lead follow-up: includes name + target + notes", lead.includes("Pat Lee") && lead.includes("Director of People") && lead.includes("Scaling team fast"));
}

// ── builders: empty context stays coherent (no throw, no undefined/null) ──────
{
  const builders: [string, () => string][] = [
    ["session summary", () => buildSessionSummaryPrompt({ serviceType: "" })],
    ["prep brief", () => buildPrepBriefPrompt({ serviceType: "" })],
    ["resume review", () => buildResumeReviewPrompt({})],
    ["job match", () => buildJobMatchPrompt({})],
    ["cover letter", () => buildCoverLetterPrompt({})],
    ["proposal scope", () => buildProposalScopePrompt({ title: "" })],
    ["message reply", () => buildMessageReplyPrompt({ clientName: "", messages: [] })],
    ["lead follow-up", () => buildLeadFollowupPrompt({ fullName: "" })],
  ];
  for (const [name, fn] of builders) {
    let ok = false;
    try {
      ok = clean(fn());
    } catch {
      ok = false;
    }
    check(`empty-context: ${name} → coherent, no throw/undefined`, ok);
  }
}

console.log(`\n${fail === 0 ? "🎉 ALL PASS" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
