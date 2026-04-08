"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { deleteBlogPost } from "@/app/actions/blog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeletePostButton({
  postId,
  postTitle,
}: {
  postId: string;
  postTitle: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  async function handleConfirm() {
    setLoading(true);
    await deleteBlogPost(postId);
    // deleteBlogPost redirects on success — loading stays true briefly
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={loading}
        className="flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
        {loading ? "Deleting…" : "Delete"}
      </button>
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete post"
        description={`Delete "${postTitle}"? This cannot be undone.`}
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}
