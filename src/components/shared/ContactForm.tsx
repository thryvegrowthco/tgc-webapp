"use client";

import * as React from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ContactForm() {
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
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    try {
      const res = await fetch("/api/contact", {
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
          Message received!
        </h3>
        <p className="text-neutral-600 leading-relaxed max-w-sm">
          Thanks for reaching out. I&apos;ll get back to you within 1–2 business
          days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="contact-first-name">First name <span className="text-red-500">*</span></Label>
          <Input id="contact-first-name" name="firstName" placeholder="Jane" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-last-name">Last name <span className="text-red-500">*</span></Label>
          <Input id="contact-last-name" name="lastName" placeholder="Smith" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-email">Email address <span className="text-red-500">*</span></Label>
        <Input id="contact-email" name="email" type="email" placeholder="jane@example.com" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-subject">Subject <span className="text-red-500">*</span></Label>
        <Input id="contact-subject" name="subject" placeholder="What's this about?" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Message <span className="text-red-500">*</span></Label>
        <Textarea
          id="contact-message"
          name="message"
          placeholder="What's on your mind?"
          required
          className="min-h-[160px]"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          "Sending..."
        ) : (
          <>
            Send Message
            <Send className="h-4 w-4" />
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <p className="text-xs text-center text-neutral-400">
        I&apos;ll respond within 1–2 business days.
      </p>
    </form>
  );
}
