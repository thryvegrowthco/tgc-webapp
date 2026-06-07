// Notification on/off gate, backed by the notification_settings table
// (migration 0022) and editable at /admin/settings.
//
// Fail-open by design: if the table/read fails, NOTHING is suppressed — we never
// silently drop mail because of a settings glitch. A notification is suppressed
// only when its key (or its audience master switch) has an explicit
// enabled = false row. "Must-send" notifications have no row, so they always send.

import { createServiceClient } from "@/lib/supabase/service";

const TTL_MS = 60_000; // 1 min — Rachel's toggles take effect within a minute on crons

let cache: { keys: Set<string>; at: number } | null = null;

/** Set of keys (incl. master switches) that are currently disabled. Cached ~60s. */
export async function getDisabledNotificationKeys(): Promise<Set<string>> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.keys;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("notification_settings")
      .select("key")
      .eq("enabled", false);
    const keys = new Set(((data ?? []) as { key: string }[]).map((r) => r.key));
    cache = { keys, at: now };
    return keys;
  } catch (err) {
    console.error("[notification settings] read failed (fail-open):", err);
    return new Set();
  }
}

/** Clear the cache so a just-saved toggle takes effect immediately. */
export function bustNotificationSettingsCache(): void {
  cache = null;
}

function masterFor(key: string): string | null {
  if (key.startsWith("admin_")) return "admin_all";
  if (key.startsWith("client_")) return "client_all";
  return null;
}

/** True when `key` (or its audience master) is explicitly disabled. */
export async function isNotificationDisabled(key: string): Promise<boolean> {
  const disabled = await getDisabledNotificationKeys();
  if (disabled.size === 0) return false;
  if (disabled.has(key)) return true;
  const master = masterFor(key);
  return master ? disabled.has(master) : false;
}
