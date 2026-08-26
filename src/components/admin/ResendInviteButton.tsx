"use client";

import * as React from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendClientInvite } from "@/app/actions/clients";

// Shown only for a client who hasn't activated their account yet. Supabase
// invite links expire in ~24h, so a resend is routine rather than exceptional.
export function ResendInviteButton({ clientId }: { clientId: string }) {
  const [busy, setBusy] = React.useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await resendClientInvite(clientId);
        setBusy(false);
        if (result.error) toast.error(result.error);
        else toast.success("Invite email sent.");
      }}
    >
      <Send className="h-3.5 w-3.5" /> {busy ? "Sending…" : "Resend invite"}
    </Button>
  );
}
