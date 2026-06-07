"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, FileText } from "lucide-react";
import { updateApplicationDetails, updateMatchNotes } from "@/app/actions/watchlist";

export interface AppDetailMatch {
  id: string;
  status: string;
  application_date: string | null;
  interview_date: string | null;
  salary_offered: number | null;
  next_steps: string | null;
  client_notes: string | null;
  resume_document_id: string | null;
  cover_letter_document_id: string | null;
}

export interface DocOption {
  id: string;
  filename: string;
  category: string | null;
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function ApplicationDetail({ match, documents }: { match: AppDetailMatch; documents: DocOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [salaryOffered, setSalaryOffered] = React.useState(match.salary_offered?.toString() ?? "");
  const [interviewDate, setInterviewDate] = React.useState(toDateInput(match.interview_date));
  const [nextSteps, setNextSteps] = React.useState(match.next_steps ?? "");
  const [notes, setNotes] = React.useState(match.client_notes ?? "");
  const [resumeId, setResumeId] = React.useState(match.resume_document_id ?? "");
  const [coverId, setCoverId] = React.useState(match.cover_letter_document_id ?? "");

  const resumes = documents.filter((d) => d.category === "resume" || d.category === "resume_rewrite");
  const coverLetters = documents.filter((d) => d.category === "cover_letter");

  async function onSave() {
    setSaving(true);
    await Promise.all([
      updateApplicationDetails(match.id, {
        salaryOffered: salaryOffered ? parseInt(salaryOffered, 10) : null,
        nextSteps,
        interviewDate: interviewDate || null,
        resumeDocumentId: resumeId || null,
        coverLetterDocumentId: coverId || null,
      }),
      updateMatchNotes(match.id, notes),
    ]);
    setSaving(false);
    toast.success("Application updated.");
    router.refresh();
  }

  const fieldClass =
    "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";
  const labelClass = "block text-xs font-medium text-neutral-600 mb-1";

  return (
    <details className="mt-3 border-t border-neutral-100 pt-3">
      <summary className="cursor-pointer text-sm font-medium text-brand-700">Details &amp; timeline</summary>

      {/* Timeline */}
      <ol className="mt-3 mb-4 space-y-2">
        <TimelineItem label="Applied" date={match.application_date} />
        <TimelineItem label="Interview" date={match.interview_date} />
      </ol>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Interview date</label>
          <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Salary offered ($)</label>
          <input
            type="number"
            value={salaryOffered}
            onChange={(e) => setSalaryOffered(e.target.value)}
            placeholder="e.g. 95000"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className={labelClass}>Next steps</label>
        <textarea
          rows={2}
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          placeholder="e.g. Follow up Friday; prep for panel interview"
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div>
          <label className={labelClass}>Resume used</label>
          <select value={resumeId} onChange={(e) => setResumeId(e.target.value)} className={fieldClass}>
            <option value="">None selected</option>
            {resumes.map((d) => (
              <option key={d.id} value={d.id}>{d.filename}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Cover letter used</label>
          <select value={coverId} onChange={(e) => setCoverId(e.target.value)} className={fieldClass}>
            <option value="">None selected</option>
            {coverLetters.map((d) => (
              <option key={d.id} value={d.id}>{d.filename}</option>
            ))}
          </select>
        </div>
      </div>
      {documents.length === 0 && (
        <p className="text-xs text-neutral-400 mt-1 inline-flex items-center gap-1">
          <FileText className="h-3 w-3" /> Upload resumes &amp; cover letters under Documents to attach them here.
        </p>
      )}

      <div className="mt-3">
        <label className={labelClass}>Your notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything to remember about this application…"
          className={fieldClass}
        />
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="mt-3 text-xs font-medium text-white bg-brand-700 hover:bg-brand-800 rounded-md px-3 py-1.5 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save details"}
      </button>
    </details>
  );
}

function TimelineItem({ label, date }: { label: string; date: string | null }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span
        className={`h-2 w-2 rounded-full flex-shrink-0 ${date ? "bg-brand-600" : "bg-neutral-200"}`}
        aria-hidden
      />
      <span className="text-neutral-500 w-20">{label}</span>
      <span className="inline-flex items-center gap-1 text-neutral-700">
        {date ? (
          <>
            <Calendar className="h-3 w-3 text-neutral-400" />
            {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </>
        ) : (
          <span className="text-neutral-300">—</span>
        )}
      </span>
    </li>
  );
}
