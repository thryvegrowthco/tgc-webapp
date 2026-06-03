import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Messages — Admin",
  robots: { index: false, follow: false },
};

type MessageRow = {
  id: string;
  client_id: string;
  sender_role: "client" | "admin";
  body: string;
  read_at: string | null;
  created_at: string;
};

interface ThreadSummary {
  clientId: string;
  clientName: string;
  clientEmail: string;
  preview: string;
  lastSenderRole: "client" | "admin";
  lastCreatedAt: string;
  unreadCount: number;
}

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/messages");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  // Pull all messages; small client base = cheap to do client-side bucketing.
  const { data: messagesRaw } = await supabase
    .from("client_messages")
    .select("id, client_id, sender_role, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const messages = (messagesRaw ?? []) as MessageRow[];

  if (messages.length === 0) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">Messages</h1>
        <p className="text-neutral-500 text-sm mb-8">Client conversations land here.</p>
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <MessageSquare className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No messages yet.</p>
        </div>
      </div>
    );
  }

  // Hydrate client display info
  const clientIds = [...new Set(messages.map((m) => m.client_id))];
  const { data: clientProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", clientIds);
  const clientMap = new Map(
    (clientProfiles ?? []).map((p) => [p.id, { name: p.full_name ?? p.email, email: p.email }])
  );

  // Bucket by client. messages is already DESC, so first hit = latest.
  const threads = new Map<string, ThreadSummary>();
  for (const m of messages) {
    const existing = threads.get(m.client_id);
    if (!existing) {
      const client = clientMap.get(m.client_id);
      threads.set(m.client_id, {
        clientId: m.client_id,
        clientName: client?.name ?? "Unknown",
        clientEmail: client?.email ?? "",
        preview: m.body.slice(0, 140),
        lastSenderRole: m.sender_role,
        lastCreatedAt: m.created_at,
        unreadCount: m.sender_role === "client" && !m.read_at ? 1 : 0,
      });
    } else {
      if (m.sender_role === "client" && !m.read_at) existing.unreadCount += 1;
    }
  }

  const ordered = Array.from(threads.values()).sort(
    (a, b) => b.lastCreatedAt.localeCompare(a.lastCreatedAt)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Messages</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {ordered.length} {ordered.length === 1 ? "thread" : "threads"}
          </p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
        {ordered.map((t) => (
          <Link
            key={t.clientId}
            href={`/admin/messages/${t.clientId}`}
            className="flex items-center justify-between gap-4 p-5 hover:bg-neutral-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-neutral-900 text-sm truncate">{t.clientName}</p>
                {t.unreadCount > 0 && (
                  <span className="text-[10px] font-semibold bg-brand-600 text-white px-1.5 py-0.5 rounded-full">
                    {t.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 truncate">
                {t.lastSenderRole === "admin" ? "You: " : ""}{t.preview}
              </p>
            </div>
            <p className="text-xs text-neutral-400 flex-shrink-0">
              {new Date(t.lastCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
