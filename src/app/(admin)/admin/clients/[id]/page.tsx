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
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, service_type, status, amount_cents, created_at, slot_id")
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
  ]);

  type BookingRow = { id: string; service_type: string; status: string | null; amount_cents: number | null; created_at: string; slot_id: string | null };
  type DocRow = { id: string; filename: string; category: string | null; description: string | null; file_size_bytes: number | null; storage_path: string; created_at: string };
  type NoteRow = { id: string; note: string; session_date: string | null; created_at: string };

  const bookings = (bookingsRaw ?? []) as BookingRow[];
  const documents = (documentsRaw ?? []) as DocRow[];
  const notes = (notesRaw ?? []) as NoteRow[];

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
                {bookings.map((b) => (
                  <div key={b.id} className="px-6 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{b.service_type}</p>
                      <p className="text-xs text-neutral-400">
                        {new Date(b.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
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
                ))}
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
