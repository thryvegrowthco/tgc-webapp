// Shared utilities for cron route handlers.
//
// Authorization model:
// - In production, cron-job.org sends `Authorization: Bearer ${CRON_SECRET}`
//   as a custom request header (configured per job in the cron-job.org UI).
// - In development (CRON_SECRET not set), any caller is allowed so the
//   endpoints are testable from the terminal.
//
// All cron endpoints accept a `?now=<ISO>` query param in non-production
// for fast verification — e.g., simulating "what would fire at T+24h".

import type { NextRequest } from "next/server";

export function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function getNowFromRequest(request: NextRequest): Date {
  if (process.env.NODE_ENV === "production") return new Date();
  const param = new URL(request.url).searchParams.get("now");
  if (!param) return new Date();
  const parsed = new Date(param);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
