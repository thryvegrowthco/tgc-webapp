"use client";

import * as React from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function JobWatchlistLeadForm() {
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      currentPosition: String(formData.get("currentPosition") ?? ""),
      targetRole: String(formData.get("targetRole") ?? ""),
      location: String(formData.get("location") ?? ""),
      remotePreference: String(formData.get("remotePreference") ?? ""),
      timeline: String(formData.get("timeline") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-5">
          <CheckCircle2 className="h-8 w-8 text-brand-600" />
        </div>
        <h3 className="font-display text-2xl font-bold text-neutral-900 mb-3">
          You&apos;re on the list.
        </h3>
        <p className="text-neutral-600 leading-relaxed max-w-sm">
          Thanks for sharing what you&apos;re looking for. Rachel will reach out
          within 1–2 business days to talk through next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="lead-name">Full name <span className="text-red-500">*</span></Label>
          <Input id="lead-name" name="fullName" placeholder="Jane Smith" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-email">Email <span className="text-red-500">*</span></Label>
          <Input id="lead-email" name="email" type="email" placeholder="jane@example.com" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-phone">Phone (optional)</Label>
        <Input id="lead-phone" name="phone" type="tel" placeholder="(555) 123-4567" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="lead-current-role">Current role</Label>
          <Input id="lead-current-role" name="currentPosition" placeholder="e.g. Senior Account Manager" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-target-role">Target role</Label>
          <Input id="lead-target-role" name="targetRole" placeholder="e.g. Director of HR" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="lead-location">Location</Label>
          <Input id="lead-location" name="location" placeholder="City, State" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-remote">Work arrangement</Label>
          <select
            id="lead-remote"
            name="remotePreference"
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="" disabled>Pick one</option>
            <option value="remote">Remote only</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
            <option value="any">Open to any</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-timeline">Timeline</Label>
        <select
          id="lead-timeline"
          name="timeline"
          defaultValue=""
          className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="" disabled>How soon are you looking to move?</option>
          <option value="actively_searching">Actively searching now</option>
          <option value="next_3_months">Within the next 3 months</option>
          <option value="next_6_months">Within the next 6 months</option>
          <option value="exploring">Just exploring</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-notes">Anything Rachel should know? (optional)</Label>
        <Textarea
          id="lead-notes"
          name="notes"
          placeholder="Industries you're targeting, deal-breakers, comp expectations, etc."
          className="min-h-[120px]"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          "Sending..."
        ) : (
          <>
            Start My Watchlist
            <Send className="h-4 w-4" />
          </>
        )}
      </Button>

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <p className="text-xs text-center text-neutral-400">
        Rachel will reach out within 1–2 business days.
      </p>
    </form>
  );
}
