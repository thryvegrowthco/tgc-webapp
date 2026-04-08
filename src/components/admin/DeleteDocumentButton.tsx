"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteDocument } from "@/app/actions/documents";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteDocumentButton({
  documentId,
  filename,
}: {
  documentId: string;
  filename: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  async function handleConfirm() {
    setLoading(true);
    await deleteDocument(documentId);
    setLoading(false);
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={loading}
        className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors disabled:opacity-40"
        title="Delete document"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete document"
        description={`Delete "${filename}"? This cannot be undone.`}
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}
