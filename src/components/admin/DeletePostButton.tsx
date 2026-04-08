"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { deleteBlogPost } from "@/app/actions/blog";

export function DeletePostButton({
  postId,
  postTitle,
}: {
  postId: string;
  postTitle: string;
}) {
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${postTitle}"? This cannot be undone.`)) return;
    setLoading(true);
    await deleteBlogPost(postId);
    // deleteBlogPost redirects on success — loading stays true briefly
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" />
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
