import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Download, Upload, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";

const categoryLabels: Record<string, string> = {
  resume: "Resume",
  cover_letter: "Cover Letter",
  notes: "Session Notes",
  worksheet: "Worksheet",
  template: "Template",
  other: "Other",
};

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadedFile {
  path: string;
  name: string;
  size: number | null;
  created_at: string | null;
  bookingId: string | null;
  serviceType: string | null;
}

export default async function DocumentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admin-shared documents (downloads from Rachel)
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  // Client-uploaded files (from intake forms or future direct uploads).
  // Storage path convention: {userId}/{bookingId}/{timestamp}-{filename}
  const uploaded: UploadedFile[] = [];
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, service_type")
    .eq("client_id", user.id);

  const bookingMap = new Map<string, string>();
  for (const b of bookings ?? []) bookingMap.set(b.id, b.service_type);

  // List one bookingId folder at a time — Supabase Storage list() only goes one level deep.
  for (const [bookingId, serviceType] of bookingMap.entries()) {
    const { data: items } = await supabase.storage
      .from("client-uploads")
      .list(`${user.id}/${bookingId}`, { sortBy: { column: "created_at", order: "desc" } });
    for (const item of items ?? []) {
      // Strip the `${timestamp}-` prefix from the storage filename for display.
      const displayName = item.name.replace(/^\d+-/, "");
      uploaded.push({
        path: `${user.id}/${bookingId}/${item.name}`,
        name: displayName,
        size: item.metadata?.size ?? null,
        created_at: item.created_at,
        bookingId,
        serviceType,
      });
    }
  }
  uploaded.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  const hasAny = (documents?.length ?? 0) > 0 || uploaded.length > 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Documents</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Files Rachel has shared with you, and files you&apos;ve uploaded for her.
        </p>
      </div>

      {/* Uploads happen on each session workspace */}
      {bookings && bookings.length > 0 && (
        <div className="mb-8 rounded-xl border border-brand-100 bg-brand-50/50 p-5 flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg flex-shrink-0">
            <Upload className="h-4 w-4 text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-neutral-900 text-sm">Need to upload something?</p>
            <p className="text-xs text-neutral-600 mt-0.5">
              Open the session workspace for your booking — that&apos;s where intake forms and uploads live.
            </p>
          </div>
          <Link
            href="/dashboard/bookings"
            className="flex-shrink-0 text-sm font-medium text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
          >
            Bookings <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Section 1: Received from Rachel */}
      {documents && documents.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
            From Rachel
          </h2>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 bg-neutral-100 rounded-lg flex-shrink-0">
                    <FileText className="h-4 w-4 text-neutral-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm truncate">{doc.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.category && (
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                          {categoryLabels[doc.category] ?? doc.category}
                        </span>
                      )}
                      {doc.file_size_bytes && (
                        <span className="text-xs text-neutral-400">{formatBytes(doc.file_size_bytes)}</span>
                      )}
                      <span className="text-xs text-neutral-400">
                        {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-xs text-neutral-500 mt-1">{doc.description}</p>
                    )}
                  </div>
                </div>
                <DownloadButton storagePath={doc.storage_path} filename={doc.filename} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Uploaded by client */}
      {uploaded.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
            Uploaded by you
          </h2>
          <div className="space-y-3">
            {uploaded.map((file) => (
              <div
                key={file.path}
                className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 bg-neutral-100 rounded-lg flex-shrink-0">
                    <Upload className="h-4 w-4 text-neutral-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {file.serviceType && (
                        <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full font-medium">
                          {file.serviceType}
                        </span>
                      )}
                      {file.size && (
                        <span className="text-xs text-neutral-400">{formatBytes(file.size)}</span>
                      )}
                      {file.created_at && (
                        <span className="text-xs text-neutral-400">
                          {new Date(file.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {file.bookingId && (
                  <Link
                    href={`/dashboard/sessions/${file.bookingId}`}
                    className="flex-shrink-0 text-sm font-medium text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
                  >
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasAny && (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Rachel will upload documents here as your work together progresses: resumes, worksheets, session notes, and more. Files you upload via your intake form will also appear here."
          />
        </div>
      )}
    </div>
  );
}

// Client component for download button (needs signed URL from Supabase Storage)
function DownloadButton({ storagePath, filename }: { storagePath: string; filename: string }) {
  // Phase 5: wire up Supabase Storage signed URL download
  // For now renders as a placeholder button
  return (
    <a
      href={`/api/documents/download?path=${encodeURIComponent(storagePath)}&name=${encodeURIComponent(filename)}`}
      className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800 transition-colors"
      aria-label={`Download ${filename}`}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Download</span>
    </a>
  );
}
