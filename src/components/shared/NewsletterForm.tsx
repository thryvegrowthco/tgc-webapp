"use client";

import * as React from "react";
import { NEWSLETTER_INTERESTS } from "@/lib/newsletter/interests";

interface NewsletterFormProps {
  /**
   * `inline` — single email input + submit (footer, blog).
   * `full`   — first name + email + interest checkboxes (landing page).
   */
  variant?: "inline" | "full";
  source?: string;
}

export function NewsletterForm({ variant = "inline", source = "footer" }: NewsletterFormProps) {
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [selectedInterests, setSelectedInterests] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");

  function toggleInterest(slug: string) {
    setSelectedInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          source,
          interests: selectedInterests,
        }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
      setEmail("");
      setFirstName("");
      setSelectedInterests([]);
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
        <p className="text-sm font-semibold text-brand-800 mb-1">You&apos;re subscribed.</p>
        <p className="text-sm text-brand-700/90">
          Check your inbox for a quick welcome note from Rachel — talk soon.
        </p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-brand-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
        {status === "error" && (
          <p className="text-xs text-red-600 mt-1 w-full">Something went wrong. Try again.</p>
        )}
      </form>
    );
  }

  // Full variant
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="First name (optional)"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="email"
          placeholder="your@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-neutral-800 mb-2">
          What do you want to hear about? <span className="font-normal text-neutral-500">(optional)</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {NEWSLETTER_INTERESTS.map((interest) => {
            const checked = selectedInterests.includes(interest.slug);
            return (
              <label
                key={interest.slug}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  checked
                    ? "border-brand-400 bg-brand-50 text-brand-800"
                    : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleInterest(interest.slug)}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                />
                {interest.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-brand-600 text-white px-6 py-2.5 text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
        <p className="text-xs text-neutral-500">
          One email a week. Unsubscribe anytime.
        </p>
      </div>

      {status === "error" && (
        <p className="text-xs text-red-600">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
