"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/app/actions/notifications";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("All notifications marked read.");
        router.refresh();
      }
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Marking…" : "Mark all read"}
    </Button>
  );
}
