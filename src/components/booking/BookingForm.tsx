"use client";

import * as React from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const services = [
  { value: "", label: "Select a service..." },
  { value: "hr-consulting", label: "HR Consulting & Team Development" },
  { value: "coaching", label: "Career & Leadership Coaching" },
  { value: "culture-engagement", label: "Culture & Engagement Consulting" },
  { value: "interview-prep", label: "Interview Preparation" },
  { value: "resume-materials", label: "Resume & Career Materials" },
  { value: "job-alerts", label: "Job Alerts & Watchlists" },
  { value: "not-sure", label: "Not sure yet — let's talk" },
];

export function BookingForm() {
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Placeholder — server action wired in Phase 4
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-5">
          <CheckCircle2 className="h-8 w-8 text-brand-600" />
        </div>
        <h3 className="font-display text-2xl font-bold text-neutral-900 mb-3">
          You&apos;re on my radar!
        </h3>
        <p className="text-neutral-600 leading-relaxed max-w-sm">
          Thanks for reaching out. I&apos;ll review your request and get back to you
          within 1–2 business days to confirm your call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first-name">First name <span className="text-red-500">*</span></Label>
          <Input id="first-name" name="firstName" placeholder="Jane" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last-name">Last name <span className="text-red-500">*</span></Label>
          <Input id="last-name" name="lastName" placeholder="Smith" required />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address <span className="text-red-500">*</span></Label>
        <Input id="email" name="email" type="email" placeholder="jane@example.com" required />
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number <span className="text-neutral-400 font-normal">(optional)</span></Label>
        <Input id="phone" name="phone" type="tel" placeholder="(555) 000-0000" />
      </div>

      {/* Service */}
      <div className="space-y-1.5">
        <Label htmlFor="service">What can I help you with? <span className="text-red-500">*</span></Label>
        <select
          id="service"
          name="service"
          required
          className={cn(
            "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2",
            "text-sm text-neutral-900",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {services.map((svc) => (
            <option key={svc.value} value={svc.value} disabled={svc.value === ""}>
              {svc.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label htmlFor="message">
          Tell me a bit about your situation <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="message"
          name="message"
          placeholder="What's going on? What are you hoping to work on? The more context you share, the better I can prepare for our call."
          required
          className="min-h-[140px]"
        />
      </div>

      {/* How did you hear */}
      <div className="space-y-1.5">
        <Label htmlFor="referral">How did you hear about Thryve Growth Co.? <span className="text-neutral-400 font-normal">(optional)</span></Label>
        <Input id="referral" name="referral" placeholder="Google, LinkedIn, referral, etc." />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          "Sending..."
        ) : (
          <>
            Request a Call
            <Send className="h-4 w-4" />
          </>
        )}
      </Button>

      <p className="text-xs text-center text-neutral-400">
        I&apos;ll respond within 1–2 business days. No spam, ever.
      </p>
    </form>
  );
}
