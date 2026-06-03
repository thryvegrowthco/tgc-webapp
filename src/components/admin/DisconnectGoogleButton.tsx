"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { disconnectGoogleCalendar } from "@/app/actions/integrations";

export function DisconnectGoogleButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    if (!confirm("Disconnect Google Calendar? Future bookings won't auto-create calendar events until you reconnect.")) {
      return;
    }
    setLoading(true);
    await disconnectGoogleCalendar();
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? "Disconnecting…" : "Disconnect"}
    </Button>
  );
}
