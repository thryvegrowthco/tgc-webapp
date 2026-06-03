import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessageThread, type ThreadMessage } from "@/components/messaging/MessageThread";
import { markThreadRead } from "@/app/actions/messages";

export default async function ClientMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/messages");

  const { data: messagesRaw } = await supabase
    .from("client_messages")
    .select("id, body, sender_role, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: true });

  const messages = (messagesRaw ?? []) as ThreadMessage[];

  // Mark Rachel's messages as read when the client opens the thread.
  await markThreadRead(user.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Messages with Rachel</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Direct conversation. Replies typically come within 1–2 business days.
        </p>
      </div>

      <MessageThread
        messages={messages}
        viewerRole="client"
        emptyMessage="No messages yet. Send Rachel a note to get started."
      />
    </div>
  );
}
