"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AiAssistPanel } from "@/components/admin/AiAssistPanel";
import { addClientNote } from "@/app/actions/documents";
import { buildResumeReviewPrompt, type ResumeReviewContext } from "@/lib/ai/prompts";

interface Props {
  clientId: string;
  context: ResumeReviewContext;
}

/** Builds a resume-review prompt; the pasted-back review is saved as a private note. */
export function ResumeReviewAssist({ clientId, context }: Props) {
  const router = useRouter();

  return (
    <AiAssistPanel
      label="Draft a resume review with ChatGPT"
      instructions="Open ChatGPT, upload the client's resume, paste this prompt, then paste the review below to save it as a private note you can refine."
      applyHint="Paste ChatGPT's review to save it as a private note on this client."
      applyLabel="Save as note"
      prompt={buildResumeReviewPrompt(context)}
      onApply={async (raw) => {
        const fd = new FormData();
        fd.set("clientId", clientId);
        fd.set("note", `AI resume review (draft):\n\n${raw.trim()}`);
        const res = await addClientNote(fd);
        if (res.error) throw new Error(res.error);
        toast.success("Saved as a private note.");
        router.refresh();
      }}
    />
  );
}
