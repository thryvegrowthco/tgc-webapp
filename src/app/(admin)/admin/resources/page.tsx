import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ResourceToggle } from "@/components/admin/ResourceToggle";
import type { Resource } from "@/types/database";

export const metadata: Metadata = {
  title: "Resources — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminResourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/resources");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const me = profile as { role: string } | null;
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: resourcesRaw } = await supabase
    .from("resources")
    .select("id, slug, category, title, description, price, cta_type, enabled, sort_order, file_path, external_url, file_name, file_size_bytes, view_count, download_count, updated_at, updated_by, created_at")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  const resources = (resourcesRaw ?? []) as Resource[];
  const enabledCount = resources.filter((r) => r.enabled).length;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-2xl font-bold text-neutral-900">Resources</h1>
          <Button asChild size="sm">
            <Link href="/admin/resources/new">
              <Plus className="h-4 w-4" /> New resource
            </Link>
          </Button>
        </div>
        <p className="text-neutral-500 text-sm mt-1">
          Toggle individual templates and tools on or off, or click into one to edit its copy.{" "}
          {enabledCount === 0
            ? "Nothing is live yet — the public page shows a coming-soon panel."
            : `${enabledCount} ${enabledCount === 1 ? "resource is" : "resources are"} live on /resources.`}
        </p>
        <p className="text-xs text-neutral-400 mt-2">
          Free <strong>Download</strong> resources go live once you add a file (or link) in the editor. Paid <strong>Buy&nbsp;Now</strong> resources still show a “Coming soon” badge. <strong>Views</strong> counts how many people saw the resource; <strong>Downloads</strong> how many grabbed the file.
        </p>
      </div>

      {resources.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 px-6 py-12 text-center text-sm text-neutral-500">
          No resources in the catalog yet. Re-run the 0014_resources migration to seed them.
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-neutral-200 px-5 py-4 flex items-center gap-4"
            >
              <ResourceToggle id={r.id} enabled={r.enabled} title={r.title} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">{r.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  <span className="font-medium text-neutral-600">{r.category}</span>
                  <span className="mx-1.5 text-neutral-300">·</span>
                  {r.price}
                  <span className="mx-1.5 text-neutral-300">·</span>
                  {r.cta_type}
                  {r.cta_type === "Download" && (
                    <>
                      <span className="mx-1.5 text-neutral-300">·</span>
                      {r.file_path || r.external_url ? (
                        <span className="text-green-600">file ready</span>
                      ) : (
                        <span className="text-amber-600">no file yet</span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-center">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{r.view_count}</p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">Views</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{r.download_count}</p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">Downloads</p>
                </div>
              </div>
              <Link
                href={`/admin/resources/${r.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                Edit <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
