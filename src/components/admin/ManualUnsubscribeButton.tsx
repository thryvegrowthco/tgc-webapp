"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { manuallyUnsubscribe } from "@/app/actions/newsletter";

interface ManualUnsubscribeButtonProps {
  id: string;
}

export function ManualUnsubscribeButton({ id }: ManualUnsubscribeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    if (!window.confirm("Mark this subscriber as unsubscribed?")) return;
    startTransition(async () => {
      const result = await manuallyUnsubscribe(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Subscriber removed");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs font-medium text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      {pending ? "Removing…" : "Unsubscribe"}
    </button>
  );
}
