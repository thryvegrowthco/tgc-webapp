"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface UnsubscribeFormProps {
  subscriberId: string;
  firstName: string | null;
}

export function UnsubscribeForm({ subscriberId, firstName }: UnsubscribeFormProps) {
  const [feedback, setFeedback] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setStatus("sending");
    try {
      await fetch("/api/newsletter/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId, feedback }),
      });
      setStatus("sent");
    } catch {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-brand-700 font-medium">
        Got it — thank you for telling Rachel.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="feedback" className="block text-sm font-semibold text-neutral-800">
        Want to tell Rachel why?{firstName ? "" : ""} <span className="font-normal text-neutral-500">(optional, totally fine to skip)</span>
      </label>
      <Textarea
        id="feedback"
        rows={3}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Too frequent, not relevant anymore, found what I needed…"
      />
      <Button type="submit" variant="outline" size="sm" disabled={status === "sending" || !feedback.trim()}>
        {status === "sending" ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
}
