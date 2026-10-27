import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Best-effort, free, serverless-safe rate limiting for public form endpoints.
 *
 * The primary path counts rows in the `form_rate_limits` table (migration 0039)
 * inside a sliding window using the service client. If that table is absent
 * (0039 not applied yet) or the database errors for any reason, it falls back to
 * a per-instance in-memory limiter so the endpoint keeps working and never
 * throws. Keys (IPs, emails) are hashed before storage — raw values are never
 * persisted.
 */

export type RateLimitArgs = {
  bucket: string;
  key: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = { limited: boolean };

/** First value of `x-forwarded-for`, else `x-real-ip`, else `"unknown"`. */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

/** SHA-256 hex of a value. No secret needed — we never store raw IPs or emails. */
export function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Per-instance fallback, used only when the DB path is unavailable. Not shared
// across serverless instances, so it is best-effort (an attacker hitting many
// instances could exceed the limit), but far better than no limit at all.
const memoryHits = new Map<string, number[]>();

function memoryLimiter({ bucket, key, limit, windowSeconds }: RateLimitArgs): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const mapKey = `${bucket}:${hashKey(key)}`;
  const recent = (memoryHits.get(mapKey) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    memoryHits.set(mapKey, recent);
    return { limited: true };
  }
  recent.push(now);
  memoryHits.set(mapKey, recent);
  return { limited: false };
}

/**
 * Returns `{ limited: true }` when the caller has already hit `limit` requests
 * for `(bucket, key)` within the last `windowSeconds`; otherwise records this
 * request and returns `{ limited: false }`. Never throws.
 */
export async function checkRateLimit(args: RateLimitArgs): Promise<RateLimitResult> {
  const { bucket, key, limit, windowSeconds } = args;
  const keyHash = hashKey(key);

  try {
    const supabase = createServiceClient();
    const sinceIso = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { count, error } = await supabase
      .from("form_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("bucket", bucket)
      .eq("key_hash", keyHash)
      .gte("created_at", sinceIso);
    if (error) throw error;

    if ((count ?? 0) >= limit) {
      return { limited: true };
    }

    const { error: insertError } = await supabase
      .from("form_rate_limits")
      .insert({ bucket, key_hash: keyHash });
    if (insertError) throw insertError;

    // Occasionally prune this bucket's rows older than 24h (best-effort cleanup).
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 86_400_000).toISOString();
      await supabase
        .from("form_rate_limits")
        .delete()
        .eq("bucket", bucket)
        .lt("created_at", cutoff);
    }

    return { limited: false };
  } catch (err) {
    console.warn(
      `[rate-limit] DB path unavailable for bucket "${bucket}", using in-memory fallback:`,
      (err as { code?: string })?.code || "unknown"
    );
    return memoryLimiter(args);
  }
}
