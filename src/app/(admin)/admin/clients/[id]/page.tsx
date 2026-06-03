import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { DocumentUploadForm } from "@/components/admin/DocumentUploadForm";
import { AddNoteForm } from "@/components/admin/AddNoteForm";
import { DeleteDocumentButton } from "@/components/admin/DeleteDocumentButton";
import { UpdateBookingStatusSelect } from "@/components/admin/UpdateBookingStatusSelect";
import { IntakeFormView } from "@/components/intake/IntakeFormView";
import { getSchemaForService } from "@/lib/intake/schemas";
import { formatCentralDateTime } from "@/lib/time/central";

const WORKFLOW_BADGES: Record<string, { label: string; className: string }> = {
  booked: { label: "Booked", className: "bg-neutral-100 text-neutral-600" },
  intake_needed: { label: "Intake needed", className: "bg-yellow-100 text-yellow-700" },
  intake_complete: { label: "Intake complete", className: "bg-blue-100 text-blue-700" },
  session_scheduled: { label: "Session scheduled", className: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  follow_up_sent: { label: "Wrapped up", className: "bg-neutral-100 text-neutral-600" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

export const metadata: Metadata = {
  title: "Client Detail — Admin",
  robots: { index: false, follow: false },
};

const categoryLabels: Record<string, string> = {
  resume: "Resume",
  cover_letter: "Cover Letter",
  notes: "Session Notes",
  worksheet: "Worksheet",
  template: "Template",
  other: "Other",
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type PageParams = { id: string };

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch client profile
  const { data: client } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, company, job_title, created_at")
    .eq("id", id)
    .eq("role", "client")
    .single();

  if (!client) notFound();

  // Fetch data in parallel
  const [
    { data: bookingsRaw },
    { data: documentsRaw },
    { data: notesRaw },
    { data: intakeRaw },
    { data: intakeResponsesRaw },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, service_type, service_key, status, workflow_status, amount_cents, session_at, intake_due_at, meet_link, meet_link_pending, created_at, slot_id")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("documents")
      .select("id, filename, category, description, file_size_bytes, storage_path, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("admin_client_notes")
      .select("id, note, session_date, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_profiles")
      .select("location, timezone, pronouns, current_position, company, industry, years_experience, primary_goal, services_interested, preferred_contact_method, availability_notes, completed_at")
      .eq("client_id", id)
      .maybeSingle(),
    supabase
      .from("intake_responses")
      .select("booking_id, service_key, responses, submitted_at, last_saved_at")
      .eq("client_id", id),
  ]);

  type BookingRow = {
    id: string;
    service_type: string;
    service_key: string | null;
    status: string | null;
    workflow_status: string;
    amount_cents: number | null;
    session_at: string | null;
    intake_due_at: string | null;
    meet_link: string | null;
    meet_link_pending: boolean;
    created_at: string;
    slot_id: string | null;
  };
  type IntakeResponseRow = {
    booking_id: string;
    service_key: string;
    responses: Record<string, unknown>;
    submitted_at: string | null;
    last_saved_at: string;
  };
  type DocRow = { id: string; filename: string; category: string | null; description: string | null; file_size_bytes: number | null; storage_path: string; created_at: string };
  type NoteRow = { id: string; note: string; session_date: string | null; created_at: string };
  type IntakeRow = {
    location: string | null;
    timezone: string | null;
    pronouns: string | null;
    current_position: string | null;
    company: string | null;
    industry: string | null;
    years_experience: string | null;
    primary_goal: string | null;
    services_interested: string[] | null;
    preferred_contact_method: string | null;
    availability_notes: string | null;
    completed_at: string | null;
  };

  const bookings = (bookingsRaw ?? []) as BookingRow[];
  const documents = (documentsRaw ?? []) as DocRow[];
  const notes = (notesRaw ?? []) as NoteRow[];
  const intake = intakeRaw as IntakeRow | null;
  const intakeResponses = (intakeResponsesRaw ?? []) as IntakeResponseRow[];
  const intakeByBooking = new Map(intakeResponses.map((r) => [r.booking_id, r]));

  const SERVICE_LABELS: Record<string, string> = {
    coaching: "Career & Leadership Coaching",
    interview_prep: "Interview Preparation",
    resume: "Resume & Career Materials",
    watchlist: "Job Alerts & Watchlists",
    hr_consulting: "HR Consulting",
    culture: "Culture & Engagement",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Breadcrumb items={[
        { label: "Clients", href: "/admin/clients" },
        { label: client.full_name ?? "Client" },
      ]} />

      {/* Client header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-neutral-900">
              {client.full_name ?? "Unnamed Client"}
            </h1>
            <a
              href={`mailto:${client.email}`}
              className="text-sm text-brand-700 hover:text-brand-800"
            >
              {client.email}
            </a>
          </div>
          <div className="text-right text-sm text-neutral-500 space-y-0.5">
            {client.phone && <p>{client.phone}</p>}
            {client.company && <p>{client.company}</p>}
            {client.job_title && <p className="text-neutral-400">{client.job_title}</p>}
            <p className="text-xs text-neutral-300">
              Joined{" "}
              {new Date(client.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Client intake */}
      {intake && intake.completed_at ? (
        <section className="bg-white rounded-xl border border-neutral-200">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">Client intake</h2>
            <span className="text-xs text-neutral-400">
              Completed {new Date(intake.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {intake.location && <Field label="Location">{intake.location}</Field>}
            {intake.timezone && <Field label="Time zone">{intake.timezone}</Field>}
            {intake.pronouns && <Field label="Pronouns">{intake.pronouns}</Field>}
            {intake.current_position && <Field label="Current role">{intake.current_position}</Field>}
            {intake.industry && <Field label="Industry">{intake.industry}</Field>}
            {intake.years_experience && <Field label="Years experience">{intake.years_experience}</Field>}
            {intake.preferred_contact_method && (
              <Field label="Preferred contact"><span className="capitalize">{intake.preferred_contact_method}</span></Field>
            )}
            {intake.services_interested && intake.services_interested.length > 0 && (
              <Field label="Services interested" wide>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {intake.services_interested.map((s) => (
                    <span key={s} className="text-xs font-medium bg-brand-50 text-brand-800 px-2 py-0.5 rounded-full">
                      {SERVICE_LABELS[s] ?? s}
                    </span>
                  ))}
                </div>
              </Field>
            )}
            {intake.primary_goal && (
              <Field label="Primary goal" wide>
                <p className="text-neutral-700 whitespace-pre-wrap">{intake.primary_goal}</p>
              </Field>
            )}
            {intake.availability_notes && (
              <Field label="Availability" wide>
                <p className="text-neutral-700 whitespace-pre-wrap">{intake.availability_notes}</p>
              </Field>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-neutral-50 border border-dashed border-neutral-200 rounded-xl px-6 py-5 text-sm text-neutral-500">
          {intake
            ? "Client started intake but hasn't finished yet."
            : "Client hasn't completed intake yet."}
        </section>
      )}

      {/* Per-booking intake responses */}
      {intakeResponses
        .filter((r) => r.submitted_at)
        .map((row) => {
          const booking = bookings.find((b) => b.id === row.booking_id);
          const schema = getSchemaForService(row.service_key);
          if (!schema) return null;
          return (
            <section
              key={row.booking_id}
              id={`intake-${row.booking_id}`}
              className="bg-white rounded-xl border border-neutral-200"
            >
              <div className="px-6 py-4 border-b border-neutral-100">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Intake for {booking?.service_type ?? row.service_key}
                </p>
                {booking?.session_at && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Session: {formatCentralDateTime(booking.session_at, { dateStyle: "long", timeStyle: "short" })} CT
                  </p>
                )}
              </div>
              <div className="px-6 py-5">
                <IntakeFormView
                  schema={schema}
                  responses={row.responses}
                  submittedAt={row.submitted_at}
                />
              </div>
            </section>
          );
        })}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-8">
          {/* Bookings */}
          <section className="bg-white rounded-xl border border-neutral-200">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-900">Bookings</h2>
            </div>
            {bookings.length === 0 ? (
              <p className="px-6 py-8 text-sm text-neutral-400 text-center">No bookings yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {bookings.map((b) => {
                  const badge = WORKFLOW_BADGES[b.workflow_status] ?? WORKFLOW_BADGES.booked;
                  const intakeRow = intakeByBooking.get(b.id);
                  return (
                    <div key={b.id} id={`booking-${b.id}`} className="px-6 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">{b.service_type}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${badge.className}`}>
                            {badge.label}
                          </span>
                          {intakeRow?.submitted_at && (
                            <a href={`#intake-${b.id}`} className="text-[10px] font-medium text-brand-700 hover:underline">
                              View intake ↓
                            </a>
                          )}
                          <p className="text-xs text-neutral-400">
                            {new Date(b.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <UpdateBookingStatusSelect
                          bookingId={b.id}
                          currentStatus={b.status ?? "pending"}
                        />
                        <span className="text-xs text-neutral-500">
                          ${((b.amount_cents ?? 0) / 100).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="bg-white rounded-xl border border-neutral-200">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-900">Session Notes</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Private notes only you can see.</p>
            </div>
            <div className="p-6 space-y-4">
              <AddNoteForm clientId={id} />
              {notes.length > 0 && (
                <div className="space-y-3 pt-2">
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-lg bg-neutral-50 border border-neutral-100 px-4 py-3">
                      <p className="text-sm text-neutral-800 whitespace-pre-wrap">{n.note}</p>
                      <p className="text-xs text-neutral-400 mt-2">
                        {n.session_date
                          ? new Date(`${n.session_date}T00:00:00`).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : new Date(n.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right column — Documents */}
        <div className="space-y-8">
          <section className="bg-white rounded-xl border border-neutral-200">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-900">Documents</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Upload files for this client.</p>
            </div>
            <div className="p-6 space-y-4">
              <DocumentUploadForm clientId={id} />

              {documents.length > 0 && (
                <div className="space-y-2 pt-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3"
                    >
                      <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {doc.filename}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {doc.category && (
                            <span className="text-xs text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                              {categoryLabels[doc.category] ?? doc.category}
                            </span>
                          )}
                          <span className="text-xs text-neutral-400">{formatBytes(doc.file_size_bytes)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <a
                          href={`/api/documents/download?path=${encodeURIComponent(doc.storage_path)}&name=${encodeURIComponent(doc.filename)}`}
                          className="p-1.5 text-neutral-400 hover:text-brand-700 transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <DeleteDocumentButton documentId={doc.id} filename={doc.filename} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {documents.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">No documents uploaded yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">{label}</p>
      <div className="text-neutral-800">{children}</div>
    </div>
  );
}
