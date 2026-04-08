import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Users, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Watchlists — Admin",
  robots: { index: false, follow: false },
};

type WatchlistRow = {
  id: string;
  client_id: string | null;
  target_roles: string[] | null;
  locations: string[] | null;
  remote_preference: string | null;
  subscription_status: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
};

export default async function AdminWatchlistsPage() {
  const supabase = await createClient();

  const { data: watchlistsRaw } = await supabase
    .from("watchlist_profiles")
    .select(
      "id, client_id, target_roles, locations, remote_preference, subscription_status, updated_at"
    )
    .order("updated_at", { ascending: false });

  const watchlists = (watchlistsRaw ?? []) as WatchlistRow[];

  const clientIds = watchlists.map((w) => w.client_id).filter(Boolean) as string[];
  let profiles: ProfileRow[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientIds);
    profiles = (data ?? []) as ProfileRow[];
  }
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Watchlists</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {watchlists.length} active watchlist{watchlists.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {watchlists.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-4 w-4 text-brand-600" />
            </div>
            <p className="text-sm text-neutral-400">No watchlist profiles yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {watchlists.map((w) => {
              const profile = w.client_id ? profileMap[w.client_id] : null;
              const roles = (w.target_roles ?? []).slice(0, 3);

              return (
                <div
                  key={w.id}
                  className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                      <p className="font-medium text-neutral-900 text-sm truncate">
                        {profile?.full_name ?? profile?.email ?? "Unknown Client"}
                      </p>
                      {w.subscription_status === "active" && (
                        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    {profile?.email && profile.full_name && (
                      <p className="text-xs text-neutral-400 mb-1">{profile.email}</p>
                    )}
                    {roles.length > 0 && (
                      <p className="text-xs text-neutral-500 truncate">
                        Looking for: {roles.join(", ")}
                        {(w.target_roles?.length ?? 0) > 3 && " …"}
                      </p>
                    )}
                    {w.remote_preference && w.remote_preference !== "any" && (
                      <span className="inline-block mt-1 text-xs text-brand-600 font-medium capitalize">
                        {w.remote_preference}
                      </span>
                    )}
                    {w.updated_at && (
                      <p className="text-xs text-neutral-300 mt-1">
                        Updated{" "}
                        {new Date(w.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>

                  {w.client_id && (
                    <Link
                      href={`/admin/watchlists/${w.client_id}`}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 transition-colors"
                    >
                      Manage <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
