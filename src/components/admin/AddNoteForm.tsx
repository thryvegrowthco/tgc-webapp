"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { addClientNote } from "@/app/actions/documents";

export function AddNoteForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("clientId", clientId);

    const result = await addClientNote(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      formRef.current?.reset();
      router.refresh();
      setTimeout(() => setSuccess(false), 2000);
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

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Note saved.
        </p>
      )}

      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Saving…" : "Add Note"}
      </Button>
    </form>
  );
}
