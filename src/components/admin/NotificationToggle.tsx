"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleNotificationSetting } from "@/app/actions/settings";

interface Props {
  settingKey: string;
  enabled: boolean;
  /** For the success toast + aria-label. */
  label: string;
}

export function NotificationToggle({ settingKey, enabled, label }: Props) {
  const router = useRouter();
  const [optimistic, setOptimistic] = React.useState(enabled);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setOptimistic(enabled);
  }, [enabled]);

  function handleClick() {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const result = await toggleNotificationSetting(settingKey, next);
      if (result.error) {
        toast.error(result.error);
        setOptimistic(!next);
        return;
      }
      toast.success(`${label} ${next ? "turned on" : "turned off"}.`);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={`Toggle ${label}`}
      disabled={pending}
      onClick={handleClick}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60",
        optimistic ? "bg-brand-600" : "bg-neutral-300"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform",
          optimistic ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
