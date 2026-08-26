import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewClientForm } from "@/components/admin/NewClientForm";

export const metadata: Metadata = {
  title: "New Client — Admin",
  robots: { index: false, follow: false },
};

export default async function NewClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/clients/new");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> All clients
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Add a client</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Create an account for someone without taking payment. No credit card needed — they can
          buy a service whenever they&apos;re ready.
        </p>
      </div>

      <NewClientForm />
    </div>
  );
}
