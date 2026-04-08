"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileEdit,
  Bell,
  BarChart2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logOut } from "@/app/actions/auth";
import { Logo } from "@/components/shared/Logo";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Bookings", href: "/admin/bookings", icon: Calendar, exact: false },
  { label: "Clients", href: "/admin/clients", icon: Users, exact: false },
  { label: "Blog", href: "/admin/content", icon: FileEdit, exact: false },
  { label: "Watchlists", href: "/admin/watchlists", icon: Bell, exact: false },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart2, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r border-neutral-200 bg-white min-h-screen">
      {/* Logo + admin badge */}
      <div className="px-6 py-5 border-b border-neutral-100">
        <Logo />
        <span className="mt-2 inline-block text-xs font-semibold uppercase tracking-widest text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Admin navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  active ? "text-brand-600" : "text-neutral-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-neutral-100">
        <form action={logOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0 text-neutral-400" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
