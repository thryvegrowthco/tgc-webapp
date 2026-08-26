// Complimentary ("comped") Job Alerts access — the auth-free core.
//
// Lives here rather than inside the server action so the integration harness can
// drive it directly: requireAdmin() has no session in a .mts script and throws
// NEXT_REDIRECT. The exported server actions in src/app/actions/watchlist.ts are
// thin auth wrappers around these two functions.
//
// Design note: comping does NOT introduce a new subscription_status value. The
// access gate stays `subscription_status === 'active'` (src/lib/watchlist/access.tsx),
// which is what keeps the three crons — job-feed, job-alerts, expire-matches —
// and the `watchlist_profiles_feed_cursor_idx` partial index working untouched.
// A comped client therefore receives matches and digests exactly like a paying
// one, with no cron changes. `access_source` only labels WHY access is on.

import { createServiceClient } from "@/lib/supabase/service";
import type { WatchlistAccessSource } from "@/types/database";

export interface CompResult {
  error?: string;
  success?: boolean;
  /** True when the watchlist row did not exist and was created by this call. */
  created?: boolean;
}

export interface GrantCompOptions {
  /** Why this comp was granted — shown to Rachel, kept as history after revoke. */
  note?: string | null;
  /** ISO timestamp. NULL/undefined = no expiry. Swept by /api/cron/expire-matches. */
  until?: string | null;
}

interface ExistingRow {
  id: string;
  subscription_status: string;
  stripe_subscription_id: string | null;
  access_source: WatchlistAccessSource;
}

async function loadRow(clientId: string): Promise<ExistingRow | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("watchlist_profiles")
    .select("id, subscription_status, stripe_subscription_id, access_source")
    .eq("client_id", clientId)
    .maybeSingle();
  return (data as ExistingRow | null) ?? null;
}

/**
 * Grant complimentary Job Alerts access, creating the watchlist row if the
 * client doesn't have one yet.
 *
 * Creating the row is the load-bearing part: setSubscriptionStatus() is an
 * UPDATE with no insert, so for a client with no row it matches zero rows and
 * still reports success — which is exactly why free access was impossible to
 * grant before.
 */
export async function applyComplimentaryAccess(
  clientId: string,
  grantedBy: string | null,
  options: GrantCompOptions = {}
): Promise<CompResult> {
  if (!clientId) return { error: "Missing client." };

  const service = createServiceClient();
  const existing = await loadRow(clientId);

  // Refuse to comp a client who is actively billing. Otherwise a mis-click
  // produces a row that is both comped and charging, which quietly corrupts
  // every paid-subscriber counter and is very hard to notice.
  if (existing?.stripe_subscription_id) {
    return {
      error:
        "This client has a Stripe subscription on file. Cancel it first, then grant free access.",
    };
  }

  const now = new Date().toISOString();
  const payload = {
    subscription_status: "active",
    access_source: "comped" as WatchlistAccessSource,
    comp_note: options.note?.trim() || null,
    comped_by: grantedBy,
    comped_at: now,
    comped_until: options.until || null,
    updated_at: now,
  };

  if (existing) {
    const { error } = await service
      .from("watchlist_profiles")
      .update(payload)
      .eq("client_id", clientId);
    if (error) {
      console.error("[comp] applyComplimentaryAccess update failed:", error);
      return { error: error.message };
    }
    return { success: true, created: false };
  }

  // Mirror the shape the Stripe subscription webhook uses when it creates a
  // skeleton row — empty criteria arrays, filled in later by the questionnaire.
  const { error } = await service.from("watchlist_profiles").insert({
    client_id: clientId,
    target_roles: [],
    industries: [],
    locations: [],
    ...payload,
  });
  if (error) {
    console.error("[comp] applyComplimentaryAccess insert failed:", error);
    return { error: error.message };
  }
  return { success: true, created: true };
}

/**
 * Revoke complimentary access. Keeps `access_source = 'comped'` plus the note
 * and grant timestamp as history — only the access itself goes away.
 */
export async function removeComplimentaryAccess(clientId: string): Promise<CompResult> {
  if (!clientId) return { error: "Missing client." };

  const existing = await loadRow(clientId);
  if (!existing) return { error: "This client has no Job Alerts profile." };
  if (existing.access_source !== "comped") {
    return {
      error: "This client's access is paid, not complimentary. Use Cancel service instead.",
    };
  }

  const service = createServiceClient();
  const { error } = await service
    .from("watchlist_profiles")
    .update({
      subscription_status: "inactive",
      comped_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId);

  if (error) {
    console.error("[comp] removeComplimentaryAccess failed:", error);
    return { error: error.message };
  }
  return { success: true };
}
