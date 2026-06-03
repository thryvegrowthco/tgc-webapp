import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { EmptyState } from "@/components/ui/empty-state";
import { ManualUnsubscribeButton } from "@/components/admin/ManualUnsubscribeButton";
import { NEWSLETTER_INTERESTS, labelForInterest } from "@/lib/newsletter/interests";

export const metadata: Metadata = {
  title: "Subscribers — Newsletter",
  robots: { index: false, follow: false },
};

type SubRow = {
  id: string;
  email: string;
  first_name: string | null;
  source: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  last_engaged_at: string | null;
  last_sent_at: string | null;
  interests: string[];
};

interface PageProps {
  searchParams: Promise<{ interest?: string; status?: string; q?: string }>;
}

export default async function SubscribersPage({ searchParams }: PageProps) {
  const { interest, status, q } = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("newsletter_subscribers")
    .select("id, email, first_name, source, subscribed_at, unsubscribed_at, last_engaged_at, last_sent_at, interests")
    .order("subscribed_at", { ascending: false })
    .limit(500);

  if (status === "unsubscribed") {
    query = query.not("unsubscribed_at", "is", null);
  } else {
    query = query.is("unsubscribed_at", null);
  }

  if (interest) {
    query = query.contains("interests", [interest]);
  }

  if (q) {
    query = query.ilike("email", `%${q}%`);
  }

  const { data: rowsRaw, error } = await query;
  const rows = (rowsRaw ?? []) as SubRow[];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/newsletter"
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:text-brand-800 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to newsletter
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-neutral-900">Subscribers</h1>
            <p className="text-sm text-neutral-500 mt-1">{rows.length} {status === "unsubscribed" ? "unsubscribed" : "active"}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-neutral-200 p-4">
        <form className="flex items-center gap-2 flex-1 min-w-[200px]" action="/admin/newsletter/subscribers">
          {interest && <input type="hidden" name="interest" value={interest} />}
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search email…"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit" className="text-xs font-medium text-brand-700 hover:text-brand-800 px-2">
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="Active" href={makeUrl({ interest, q, status: undefined })} active={status !== "unsubscribed"} />
          <FilterChip label="Unsubscribed" href={makeUrl({ interest, q, status: "unsubscribed" })} active={status === "unsubscribed"} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="All interests" href={makeUrl({ q, status, interest: undefined })} active={!interest} />
          {NEWSLETTER_INTERESTS.map((opt) => (
            <FilterChip
              key={opt.slug}
              label={opt.label}
              href={makeUrl({ q, status, interest: opt.slug })}
              active={interest === opt.slug}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Could not load subscribers — {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200">
          <EmptyState icon={Users} title="No subscribers match this filter." />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Email</th>
                <th className="text-left px-4 py-2.5 font-medium">Interests</th>
                <th className="text-left px-4 py-2.5 font-medium">Source</th>
                <th className="text-left px-4 py-2.5 font-medium">Joined</th>
                <th className="text-left px-4 py-2.5 font-medium">Last engaged</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((sub) => (
                <tr key={sub.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{sub.email}</div>
                    {sub.first_name && (
                      <div className="text-xs text-neutral-500">{sub.first_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub.interests.length === 0 ? (
                      <span className="text-xs text-neutral-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {sub.interests.map((slug) => (
                          <span
                            key={slug}
                            className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full"
                          >
                            {labelForInterest(slug)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{sub.source ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {new Date(sub.subscribed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {sub.last_engaged_at
                      ? new Date(sub.last_engaged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!sub.unsubscribed_at && <ManualUnsubscribeButton id={sub.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
        active
          ? "bg-brand-600 text-white"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
      }`}
    >
      {label}
    </Link>
  );
}

function makeUrl(params: { interest?: string; status?: string; q?: string }): string {
  const sp = new URLSearchParams();
  if (params.interest) sp.set("interest", params.interest);
  if (params.status) sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  const qs = sp.toString();
  return `/admin/newsletter/subscribers${qs ? `?${qs}` : ""}`;
}
