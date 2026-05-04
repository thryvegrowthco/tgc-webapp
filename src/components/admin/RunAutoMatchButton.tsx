"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runAutoMatchForClient } from "@/app/actions/watchlist";

export function RunAutoMatchButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onClick() {
    setPending(true);
    try {
      const result = await runAutoMatchForClient(clientId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if ("matched" in result) {
        if (result.matched === 0) {
          toast.info(`Scored ${result.evaluated} jobs. No new matches above threshold.`);
        } else {
          toast.success(
            `Scored ${result.evaluated} jobs. Added ${result.matched} new ${result.matched === 1 ? "match" : "matches"}.`
          );
        }
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={onClick} disabled={pending} size="sm" variant="outline">
      <Sparkles className="h-3.5 w-3.5" />
      {pending ? "Scoring jobs..." : "Run auto-match"}
    </Button>
  );
}
