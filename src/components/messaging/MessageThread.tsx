"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendMessage } from "@/app/actions/messages";

export interface ThreadMessage {
  id: string;
  body: string;
  sender_role: "client" | "admin";
  created_at: string;
}

interface MessageThreadProps {
  messages: ThreadMessage[];
  viewerRole: "client" | "admin";
  /** When the viewer is admin, identifies the client whose thread this is. */
  clientId?: string;
  emptyMessage: string;
}

export function MessageThread({ messages, viewerRole, clientId, emptyMessage }: MessageThreadProps) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const result = await sendMessage({ body, clientId });
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div className="flex flex-col h-[600px] bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-12">{emptyMessage}</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_role === viewerRole;
            return (
              <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    isMine
                      ? "bg-brand-600 text-white rounded-br-md"
                      : "bg-neutral-100 text-neutral-900 rounded-bl-md"
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1.5 opacity-70",
                      isMine ? "text-white/80" : "text-neutral-500"
                    )}
                  >
                    {new Date(msg.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-neutral-100 p-4 space-y-3">
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={viewerRole === "client" ? "Message Rachel…" : "Reply to client…"}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />
          <Button type="submit" disabled={sending || !body.trim()} className="h-[60px] px-4">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-neutral-400">Press ⌘/Ctrl + Enter to send. Reply within 1–2 business days.</p>
      </form>
    </div>
  );
}
