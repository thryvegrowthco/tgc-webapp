import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { ResourceCreateForm } from "@/components/admin/ResourceCreateForm";

export const metadata: Metadata = {
  title: "New Resource — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminResourceNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/resources/new");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Resources", href: "/admin/resources" },
          { label: "New resource" },
        ]}
      />
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">New resource</h1>
        <p className="text-neutral-500 text-sm mt-1">Add the basics, then upload the file on the next step.</p>
      </div>
      <ResourceCreateForm />
    </div>
  );
}
