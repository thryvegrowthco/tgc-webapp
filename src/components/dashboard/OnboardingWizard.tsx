"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveOnboarding } from "@/app/actions/onboarding";

type StepKey = "about" | "work" | "goals" | "contact";
const STEPS: { key: StepKey; label: string }[] = [
  { key: "about", label: "About you" },
  { key: "work", label: "Your work" },
  { key: "goals", label: "Why you're here" },
  { key: "contact", label: "Working together" },
];

const SERVICE_OPTIONS = [
  { value: "coaching", label: "Career & Leadership Coaching" },
  { value: "interview_prep", label: "Interview Preparation" },
  { value: "resume", label: "Resume & Career Materials" },
  { value: "watchlist", label: "Job Alerts & Watchlists" },
  { value: "hr_consulting", label: "HR Consulting" },
  { value: "culture", label: "Culture & Engagement" },
];

const YEARS_OPTIONS = [
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "6-10", label: "6–10 years" },
  { value: "10+", label: "10+ years" },
];

export interface OnboardingInitial {
  location: string | null;
  timezone: string | null;
  pronouns: string | null;
  currentRole: string | null;
  company: string | null;
  industry: string | null;
  yearsExperience: string | null;
  primaryGoal: string | null;
  servicesInterested: string[];
  preferredContactMethod: string | null;
  availabilityNotes: string | null;
  hasResume: boolean;
}

export function OnboardingWizard({ initial }: { initial: OnboardingInitial }) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  function next() {
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function back() {
    setStepIdx((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await saveOnboarding(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        setSubmitting(false);
      }
      // On success the action redirects; nothing else to do here
    } catch (err) {
      // Next.js redirects throw — that's expected on success
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        return;
      }
      console.error(err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <ol className="flex items-center justify-between mb-8" aria-label="Onboarding progress">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <li key={s.key} className="flex-1 flex flex-col items-center text-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors ${
                  done
                    ? "bg-brand-600 text-white"
                    : active
                      ? "bg-brand-100 text-brand-800 ring-2 ring-brand-500"
                      : "bg-neutral-100 text-neutral-400"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs ${active ? "font-semibold text-brand-700" : "text-neutral-500"}`}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      <form ref={formRef} onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 space-y-5">
        {/* Step 1: About you */}
        <div hidden={STEPS[stepIdx].key !== "about"} className="space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-neutral-900 mb-1">A little about you</h2>
            <p className="text-sm text-neutral-500">Helps me schedule sessions at times that work for you.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="City, State" defaultValue={initial.location ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Time zone</Label>
              <Input id="timezone" name="timezone" placeholder="e.g. Central, ET, PT" defaultValue={initial.timezone ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pronouns">Pronouns (optional)</Label>
            <Input id="pronouns" name="pronouns" placeholder="e.g. she/her, they/them" defaultValue={initial.pronouns ?? ""} />
          </div>
        </div>

        {/* Step 2: Your work */}
        <div hidden={STEPS[stepIdx].key !== "work"} className="space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-neutral-900 mb-1">Your work</h2>
            <p className="text-sm text-neutral-500">Whatever applies — skip anything that doesn&apos;t.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentRole">Current role</Label>
              <Input id="currentRole" name="currentRole" placeholder="e.g. Senior Account Manager" defaultValue={initial.currentRole ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" placeholder="Company name" defaultValue={initial.company ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" placeholder="e.g. SaaS, Healthcare, Nonprofit" defaultValue={initial.industry ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <select
                id="yearsExperience"
                name="yearsExperience"
                defaultValue={initial.yearsExperience ?? ""}
                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Pick one</option>
                {YEARS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Goals */}
        <div hidden={STEPS[stepIdx].key !== "goals"} className="space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-neutral-900 mb-1">What brought you here?</h2>
            <p className="text-sm text-neutral-500">The more specific, the better I can help.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primaryGoal">Primary goal</Label>
            <Textarea
              id="primaryGoal"
              name="primaryGoal"
              placeholder="What's the main thing you'd like to figure out or move forward with?"
              defaultValue={initial.primaryGoal ?? ""}
              className="min-h-[100px]"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-neutral-700 mb-1.5">Services you&apos;re interested in</legend>
            <p className="text-xs text-neutral-500 mb-2">Pick any that apply — there&apos;s no wrong answer.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map((s) => (
                <label key={s.value} className="flex items-start gap-2.5 rounded-lg border border-neutral-200 p-3 cursor-pointer hover:bg-brand-50 hover:border-brand-200 transition-colors">
                  <input
                    type="checkbox"
                    name="servicesInterested"
                    value={s.value}
                    defaultChecked={initial.servicesInterested.includes(s.value)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-neutral-800">{s.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Step 4: Contact + resume */}
        <div hidden={STEPS[stepIdx].key !== "contact"} className="space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-neutral-900 mb-1">How we&apos;ll work together</h2>
            <p className="text-sm text-neutral-500">A few logistics so we can hit the ground running.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preferredContactMethod">Preferred contact method</Label>
            <select
              id="preferredContactMethod"
              name="preferredContactMethod"
              defaultValue={initial.preferredContactMethod ?? ""}
              className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Pick one</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="text">Text message</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="availabilityNotes">When you&apos;re generally available</Label>
            <Textarea
              id="availabilityNotes"
              name="availabilityNotes"
              placeholder="e.g. Weekdays after 5pm CT, lunch breaks, occasional Saturdays"
              defaultValue={initial.availabilityNotes ?? ""}
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resume">Resume (optional)</Label>
            <input
              id="resume"
              name="resume"
              type="file"
              accept=".pdf,.doc,.docx"
              className="block w-full text-sm text-neutral-700 file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 file:bg-brand-100 file:text-brand-800 file:font-medium hover:file:bg-brand-200 file:cursor-pointer"
            />
            <p className="text-xs text-neutral-500">
              {initial.hasResume
                ? "You already have a resume on file. Upload a new one to replace it, or leave this empty."
                : "PDF or Word, up to 25 MB. Helps me give specific feedback rather than asking you to send it later."}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          {stepIdx > 0 ? (
            <Button type="button" variant="outline" onClick={back} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <span />
          )}

          {stepIdx < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : (<>Finish <CheckCircle2 className="h-4 w-4" /></>)}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
