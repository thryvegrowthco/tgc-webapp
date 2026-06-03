"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveIdea, deleteIdea } from "@/app/actions/newsletter";

interface Idea {
  id: string;
  body: string;
  created_at: string;
}

interface IdeaInboxProps {
  ideas: Idea[];
}

export function IdeaInbox({ ideas }: IdeaInboxProps) {
  const router = useRouter();
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);
    const result = await saveIdea(draft);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setDraft("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteIdea(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Idea, headline, link, half-thought…"
        />
        <Button onClick={handleSave} disabled={saving || !draft.trim()} size="sm">
          {saving ? "Saving…" : "Save idea"}
        </Button>
      </div>

      {ideas.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-4">No ideas captured yet.</p>
      ) : (
        <ul className="space-y-2">
          {ideas.map((idea) => (
            <li
              key={idea.id}
              className="flex items-start gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 bg-neutral-50"
            >
              <span className="flex-1 whitespace-pre-wrap">{idea.body}</span>
              <button
                type="button"
                onClick={() => handleDelete(idea.id)}
                className="text-neutral-400 hover:text-red-500 flex-shrink-0 mt-0.5"
                aria-label="Delete idea"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
