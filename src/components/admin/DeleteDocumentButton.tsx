"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteDocument } from "@/app/actions/documents";

export function DeleteDocumentButton({
  documentId,
  filename,
}: {
  documentId: string;
  filename: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setLoading(true);
    await deleteDocument(documentId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors disabled:opacity-40"
      title="Delete document"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
