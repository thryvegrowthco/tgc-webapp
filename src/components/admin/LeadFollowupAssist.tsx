"use client";

import { AiAssistPanel } from "@/components/admin/AiAssistPanel";
import { buildLeadFollowupPrompt, type LeadFollowupContext } from "@/lib/ai/prompts";

/** Copy-only follow-up drafting for a lead (the lead page has no compose box). */
export function LeadFollowupAssist({ context }: { context: LeadFollowupContext }) {
  return (
    <AiAssistPanel
      label="Draft a follow-up email with ChatGPT"
      instructions="Copy this into ChatGPT to draft a warm follow-up, then copy the result and send it from your own inbox."
      prompt={buildLeadFollowupPrompt(context)}
    />
  );
}
