// Insert-and-forget helper for a client's in-app notification feed.
//
// Mirrors createAdminNotification (src/lib/notifications/admin.ts) but targets
// the client_notifications table, surfaced via the dashboard bell. Writes use
// the service-role client so they work from any verified context (admin server
// actions, the client's own actions, crons, webhooks).
//
// Failures are logged + swallowed — a missed notification never blocks the
// surrounding action.

import { createServiceClient } from "@/lib/supabase/service";
import { isNotificationDisabled } from "@/lib/notifications/settings";
import type { ClientNotificationType } from "@/types/database";

export interface CreateClientNotificationArgs {
  clientId: string;
  type: ClientNotificationType;
  title: string;
  body?: string;
  link?: string;
  matchId?: string | null;
}

export async function createClientNotification(args: CreateClientNotificationArgs): Promise<void> {
  if (await isNotificationDisabled(`client_bell:${args.type}`)) return;
  try {
    const supabase = createServiceClient();
    await supabase.from("client_notifications").insert({
      client_id: args.clientId,
      type: args.type,
      title: args.title,
      body: args.body ?? null,
      link: args.link ?? null,
      related_match_id: args.matchId ?? null,
    });
  } catch (err) {
    console.error("[client notifications] insert failed:", err);
  }
}
