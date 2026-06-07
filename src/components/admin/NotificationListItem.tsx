"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { markNotificationRead } from "@/app/actions/notifications";
import type { AdminNotification } from "@/types/database";

const TYPE_LABEL: Record<AdminNotification["type"], string> = {
  new_booking: "New booking",
  intake_submitted: "Intake submitted",
  client_doc_upload: "Document uploaded",
  intake_overdue: "Intake overdue",
  session_in_24h: "Session in 24h",
  new_subscriber: "New subscriber",
  subscriber_unsubscribed: "Unsubscribed",
  subscriber_updated: "Preferences updated",
  new_subscription: "New subscription",
  subscription_issue: "Subscription issue",
  watchlist_updated: "Watchlist updated",
  application_status: "Application update",
  client_message: "New message",
};

const TYPE_CLASS: Record<AdminNotification["type"], string> = {
  new_booking: "bg-green-50 text-green-700",
  intake_submitted: "bg-blue-50 text-blue-700",
  client_doc_upload: "bg-purple-50 text-purple-700",
  intake_overdue: "bg-red-50 text-red-700",
  session_in_24h: "bg-amber-50 text-amber-700",
  new_subscriber: "bg-green-50 text-green-700",
  subscriber_unsubscribed: "bg-neutral-100 text-neutral-600",
  subscriber_updated: "bg-blue-50 text-blue-700",
  new_subscription: "bg-green-50 text-green-700",
  subscription_issue: "bg-red-50 text-red-700",
  watchlist_updated: "bg-blue-50 text-blue-700",
  application_status: "bg-amber-50 text-amber-700",
  client_message: "bg-purple-50 text-purple-700",
};

export function NotificationListItem({ notification }: { notification: AdminNotification }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const unread = notification.read_at === null;

  function markRead() {
    if (!unread) return;
    startTransition(async () => {
      const result = await markNotificationRead(notification.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const body = (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
          unread ? "bg-brand-600" : "bg-transparent"
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
              TYPE_CLASS[notification.type]
            )}
          >
            {TYPE_LABEL[notification.type]}
          </span>
          <p className={cn("text-sm text-neutral-900 truncate", unread && "font-semibold")}>
            {notification.title}
          </p>
        </div>
        {notification.body && (
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[11px] text-neutral-400 mt-1">
          {new Date(notification.created_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
      {unread && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            markRead();
          }}
          disabled={pending}
          className="text-neutral-400 hover:text-brand-700 transition-colors p-1 disabled:opacity-50"
          aria-label="Mark read"
          title="Mark read"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <li>
      {notification.link ? (
        <Link
          href={notification.link}
          onClick={() => {
            if (unread) markRead();
          }}
          className="block"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
