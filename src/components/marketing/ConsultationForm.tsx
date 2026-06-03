"use client";

import * as React from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TIMING_OPTIONS = [
  "ASAP",
  "This week",
  "Next week",
  "Within the next month",
  "Flexible",
] as const;

export function ConsultationForm() {
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      timing: String(formData.get("timing") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    try {
      const res = await fetch("/api/consultation", {
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
          Request received!
        </h3>
        <p className="text-neutral-600 leading-relaxed max-w-sm">
          Thanks for reaching out. I&apos;ll personally get back to you within 1–2
          business days with a couple of times that work for your free 30-minute call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="consult-first-name">
            First name <span className="text-red-500">*</span>
          </Label>
          <Input id="consult-first-name" name="firstName" placeholder="Jane" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="consult-last-name">
            Last name <span className="text-red-500">*</span>
          </Label>
          <Input id="consult-last-name" name="lastName" placeholder="Smith" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="consult-email">
          Email address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="consult-email"
          name="email"
          type="email"
          placeholder="jane@example.com"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="consult-phone">Phone (optional)</Label>
          <Input
            id="consult-phone"
            name="phone"
            type="tel"
            placeholder="(555) 123-4567"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="consult-timing">When works best?</Label>
          <select
            id="consult-timing"
            name="timing"
            defaultValue="Flexible"
            className={cn(
              "flex h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base text-neutral-900 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500"
            )}
          >
            {TIMING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="consult-message">
          What would you like to talk about?{" "}
          <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="consult-message"
          name="message"
          placeholder="A few sentences about what's going on, what you're hoping to figure out, or what kind of help you're looking for."
          required
          className="min-h-[140px]"
        />
        <p className="text-xs text-neutral-400">
          The more context I have, the more useful our call will be.
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          "Sending..."
        ) : (
          <>
            Request My Free 30-Minute Call
            <Send className="h-4 w-4" />
          </>
        )}
      </Button>

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <p className="text-xs text-center text-neutral-400">
        No payment required. No sales pressure. I&apos;ll respond within 1–2 business days.
      </p>
    </form>
  );
}
