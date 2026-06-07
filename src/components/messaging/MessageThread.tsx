"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendMessage, uploadMessageAttachment } from "@/app/actions/messages";

export interface ThreadMessage {
  id: string;
  body: string;
  sender_role: "client" | "admin";
  created_at: string;
  attachment_path?: string | null;
}

function attachmentName(path: string): string {
  const last = path.split("/").pop() ?? path;
  return last.replace(/^\d+-/, "");
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
  const [file, setFile] = React.useState<File | null>(null);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !file) return;
    setSending(true);
    setError(null);

    let attachmentPath: string | undefined;
    if (file) {
      const fd = new FormData();
      fd.set("file", file);
      if (clientId) fd.set("clientId", clientId);
      const upload = await uploadMessageAttachment(fd);
      if (upload.error) {
        setSending(false);
        setError(upload.error);
        return;
      }
      attachmentPath = upload.path;
    }

    const result = await sendMessage({ body, clientId, attachmentPath });
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBody("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
                  {msg.body && <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>}
                  {msg.attachment_path && (
                    <a
                      href={`/api/messages/attachment?path=${encodeURIComponent(msg.attachment_path)}&name=${encodeURIComponent(attachmentName(msg.attachment_path))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium underline",
                        isMine ? "text-white/90" : "text-brand-700"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {attachmentName(msg.attachment_path)}
                    </a>
                  )}
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
        {file && (
          <div className="flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2">
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate flex-1">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-neutral-400 hover:text-neutral-700"
              aria-label="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-[60px] px-3"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach a file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
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
          <Button type="submit" disabled={sending || (!body.trim() && !file)} className="h-[60px] px-4">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-neutral-400">Attach a file or press ⌘/Ctrl + Enter to send. Replies within 1–2 business days.</p>
      </form>
    </div>
  );
}
