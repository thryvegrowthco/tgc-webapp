import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/resources/view  { ids: string[] }
// Public. Records a "view" (a visitor saw the resource on /resources) — one per
// resource per browser session; the client de-dups via sessionStorage before
// calling. Best-effort, and validated against enabled resources so the counter
// can't be inflated with arbitrary IDs.
export async function POST(request: NextRequest) {
  let ids: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.ids)) {
      ids = body.ids.filter((x: unknown): x is string => typeof x === "string").slice(0, 50);
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ ok: true, counted: 0 });

  const svc = createServiceClient();
  const { data: rows } = await svc
    .from("resources")
    .select("id")
    .in("id", ids)
    .eq("enabled", true);
  const validIds = ((rows ?? []) as { id: string }[]).map((r) => r.id);
  if (validIds.length === 0) return NextResponse.json({ ok: true, counted: 0 });

  const ua = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  try {
    await svc
      .from("resource_events")
      .insert(validIds.map((id) => ({ resource_id: id, event_type: "view" as const, user_agent: ua })));
    await Promise.all(
      validIds.map((id) => svc.rpc("increment_resource_view", { p_resource_id: id }))
    );
  } catch {
    // best-effort — never surface tracking failures to the visitor
  }
  return NextResponse.json({ ok: true, counted: validIds.length });
}
