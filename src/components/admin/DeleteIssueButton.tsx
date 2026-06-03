"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteIssue } from "@/app/actions/newsletter";

interface DeleteIssueButtonProps {
  id: string;
}

export function DeleteIssueButton({ id }: DeleteIssueButtonProps) {
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteIssue(id);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={pending}
      variant="outline"
      size="sm"
      className="border-red-200 text-red-700 hover:bg-red-50"
    >
      <Trash2 className="h-3.5 w-3.5" /> Delete
    </Button>
  );
}
