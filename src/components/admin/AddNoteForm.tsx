"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { addClientNote } from "@/app/actions/documents";

export function AddNoteForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("clientId", clientId);

    const result = await addClientNote(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Note saved.");
      formRef.current?.reset();
      router.refresh();
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="note">Note <span className="text-red-500">*</span></Label>
        <Textarea
          id="note"
          name="note"
          placeholder="Session notes, observations, next steps…"
          className="min-h-[80px] text-sm"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sessionDate">
          Session date{" "}
          <span className="text-neutral-400 font-normal text-xs">(optional)</span>
        </Label>
        <Input id="sessionDate" name="sessionDate" type="date" className="h-9 text-sm" />
      </div>

      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Saving…" : "Add Note"}
      </Button>
    </form>
  );
}
