import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { MessageThread, type ThreadMessage } from "@/components/messaging/MessageThread";

export const metadata: Metadata = {
  title: "Message Thread — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminMessageThreadPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/admin/messages/${clientId}`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  const { data: client } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) notFound();

  const { data: messagesRaw } = await supabase
    .from("client_messages")
    .select("id, body, sender_role, created_at, attachment_path")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  const messages = (messagesRaw ?? []) as ThreadMessage[];

  // Mark the client's messages as read inline (revalidatePath can't run during
  // render). Admin-verified above; service client guarantees the write.
  await createServiceClient()
    .from("client_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("sender_role", "client")
    .is("read_at", null);

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/messages"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> All threads
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          {client.full_name ?? client.email}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          <a href={`mailto:${client.email}`} className="text-brand-700 hover:underline">{client.email}</a>
          {" · "}
          <Link href={`/admin/clients/${client.id}`} className="text-brand-700 hover:underline">
            Open client record
          </Link>
        </p>
      </div>

      <MessageThread
        messages={messages}
        viewerRole="admin"
        clientId={clientId}
        emptyMessage="No messages from this client yet."
      />
    </div>
  );
}
