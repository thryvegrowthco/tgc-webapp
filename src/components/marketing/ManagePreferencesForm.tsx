"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { NEWSLETTER_INTERESTS } from "@/lib/newsletter/interests";

interface ManagePreferencesFormProps {
  token: string;
  email: string;
  firstName: string | null;
  interests: string[];
  unsubscribed: boolean;
}

export function ManagePreferencesForm({
  token,
  email,
  firstName,
  interests,
  unsubscribed,
}: ManagePreferencesFormProps) {
  const [selected, setSelected] = React.useState<string[]>(interests);
  const [isUnsubscribed, setIsUnsubscribed] = React.useState(unsubscribed);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = React.useState<string | null>(null);

  function toggle(slug: string) {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSave() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/newsletter/manage/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: selected, resubscribe: isUnsubscribed ? false : undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Could not save");
        setStatus("idle");
        return;
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setError("Network error. Try again.");
      setStatus("idle");
    }
  }

  async function handleResubscribe() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/newsletter/manage/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: selected, resubscribe: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Could not resubscribe");
        setStatus("idle");
        return;
      }
      setIsUnsubscribed(false);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setError("Network error. Try again.");
      setStatus("idle");
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-1">
        Your subscription{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm text-neutral-500 mb-6">{email}</p>

      {isUnsubscribed && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-6">
          <p className="text-sm text-amber-800 mb-2">You&apos;re currently unsubscribed.</p>
          <Button onClick={handleResubscribe} size="sm" disabled={status === "saving"}>
            Resubscribe me
          </Button>
        </div>
      )}

      <h2 className="text-sm font-semibold text-neutral-800 mb-3">What do you want to hear about?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {NEWSLETTER_INTERESTS.map((interest) => {
          const checked = selected.includes(interest.slug);
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
                onChange={() => toggle(interest.slug)}
                disabled={isUnsubscribed}
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
              />
              {interest.label}
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
        <Button onClick={handleSave} disabled={status === "saving" || isUnsubscribed}>
          {status === "saving" ? "Saving…" : "Save preferences"}
        </Button>
        <Button asChild variant="outline" size="default">
          <a href={`/newsletter/unsubscribe/${encodeURIComponent(token)}`}>Unsubscribe</a>
        </Button>
        {status === "saved" && (
          <p className="text-sm text-green-700 font-medium">Saved.</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-3">{error}</p>
      )}
    </div>
  );
}
