import { redirect } from "next/navigation";
import { FileText, Download } from "lucide-react";
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

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Documents</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Files Rachel has shared with you. Download anytime.
        </p>
      </div>

      {documents && documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc) => {
            return (
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
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Rachel will upload documents here as your work together progresses — resumes, worksheets, session notes, and more."
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
