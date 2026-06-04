"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import type { AdminNotification } from "@/types/database";

interface NotificationBellProps {
  notifications: AdminNotification[];
  unreadCount: number;
}

/**
 * Bell + dropdown in the admin top bar. Poll-refresh on a 60s tick keeps
 * the badge fresh without paying for Supabase Realtime — router.refresh()
 * re-runs the server fetch in the admin layout, which feeds the props back in.
 */
export function NotificationBell({ notifications, unreadCount }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [pending, startTransition] = React.useTransition();

  // Close on outside click / Escape.
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Poll every 60s so new notifications arrive without a full reload.
  React.useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [router]);

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleMarkOne(id: string) {
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <p className="text-sm font-semibold text-neutral-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={pending}
                className="text-xs font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-neutral-400">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="max-h-[440px] overflow-y-auto divide-y divide-neutral-100">
              {notifications.map((n) => {
                const unread = n.read_at === null;
                return (
                  <li key={n.id}>
                    <NotificationRow
                      notification={n}
                      unread={unread}
                      onMarkRead={() => handleMarkOne(n.id)}
                      onNavigate={() => setOpen(false)}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          <div className="px-4 py-3 border-t border-neutral-100 text-center">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  unread,
  onMarkRead,
  onNavigate,
}: {
  notification: AdminNotification;
  unread: boolean;
  onMarkRead: () => void;
  onNavigate: () => void;
}) {
  const inner = (
    <div className="px-4 py-3 flex items-start gap-3 hover:bg-neutral-50">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
          unread ? "bg-brand-600" : "bg-transparent"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm text-neutral-900 truncate", unread && "font-semibold")}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[11px] text-neutral-400 mt-1">{timeAgo(notification.created_at)}</p>
      </div>
      {unread && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead();
          }}
          className="text-neutral-400 hover:text-brand-700 transition-colors p-1"
          aria-label="Mark read"
          title="Mark read"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link
        href={notification.link}
        onClick={() => {
          if (unread) onMarkRead();
          onNavigate();
        }}
        className="block"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
