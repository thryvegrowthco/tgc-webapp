import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { ResourceEditForm } from "@/components/admin/ResourceEditForm";
import type { Resource } from "@/types/database";

export const metadata: Metadata = {
  title: "Edit Resource — Admin",
  robots: { index: false, follow: false },
};

type PageParams = { id: string };

export default async function AdminResourceEditPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/admin/resources/${id}`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const me = profile as { role: string } | null;
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: resourceRaw } = await supabase
    .from("resources")
    .select("id, slug, category, title, description, price, cta_type, enabled, sort_order, file_path, external_url, file_name, file_size_bytes, view_count, download_count, updated_at, updated_by, created_at")
    .eq("id", id)
    .maybeSingle();
  const resource = resourceRaw as Resource | null;
  if (!resource) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Resources", href: "/admin/resources" },
          { label: resource.title },
        ]}
      />

      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">{resource.title}</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Edit anything below and click Save. Changes appear on /resources immediately.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
          <p className="text-2xl font-bold text-neutral-900">{resource.view_count}</p>
          <p className="text-xs text-neutral-500 mt-0.5">People who viewed this resource</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
          <p className="text-2xl font-bold text-neutral-900">{resource.download_count}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Downloads</p>
        </div>
      </div>

      <ResourceEditForm resource={resource} />
    </div>
  );
}
