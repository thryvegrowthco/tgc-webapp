"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markAllClientNotificationsRead,
  markClientNotificationRead,
} from "@/app/actions/notifications";
import type { ClientNotification } from "@/types/database";

interface Props {
  notifications: ClientNotification[];
  unreadCount: number;
}

/** Client dashboard bell + dropdown. Polls every 60s via router.refresh(). */
export function NotificationBell({ notifications, unreadCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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

  React.useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [router]);

  function handleMarkAll() {
    startTransition(async () => {
      await markAllClientNotificationsRead();
      router.refresh();
    });
  }

  function handleMarkOne(id: string) {
    startTransition(async () => {
      await markClientNotificationRead(id);
      router.refresh();
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
            <div className="px-6 py-10 text-center text-sm text-neutral-400">You&apos;re all caught up.</div>
          ) : (
            <ul className="max-h-[440px] overflow-y-auto divide-y divide-neutral-100">
              {notifications.map((n) => {
                const unread = n.read_at === null;
                const body = (
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {unread && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 flex-shrink-0" />}
                      <div className={cn("flex-1 min-w-0", !unread && "pl-3.5")}>
                        <p className="text-sm font-medium text-neutral-900">{n.title}</p>
                        {n.body && <p className="text-xs text-neutral-500 mt-0.5">{n.body}</p>}
                        <p className="text-[11px] text-neutral-400 mt-1">
                          {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className={cn(unread && "bg-brand-50/40")}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => {
                          if (unread) handleMarkOne(n.id);
                          setOpen(false);
                        }}
                        className="block hover:bg-neutral-50"
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => unread && handleMarkOne(n.id)}
                        className="block w-full text-left hover:bg-neutral-50"
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
