import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BookingInvitationForm } from "@/components/admin/BookingInvitationForm";

export const metadata: Metadata = {
  title: "New Booking Invitation — Admin",
  robots: { index: false, follow: false },
};

export default async function NewInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/invitations/new");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  let prefillEmail: string | null = null;
  let prefillName: string | null = null;
  if (clientId) {
    const { data: client } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", clientId)
      .maybeSingle();
    const c = client as { email: string; full_name: string | null } | null;
    prefillEmail = c?.email ?? null;
    prefillName = c?.full_name ?? null;
  }

  return (
    <div>
      <Link
        href="/admin/invitations"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> All invitations
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">New booking invitation</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Pick a few date and time options and email them to the client. They choose one and the
          session is created automatically.
        </p>
      </div>

      <BookingInvitationForm
        prefillClientId={clientId ?? null}
        prefillClientEmail={prefillEmail}
        prefillClientName={prefillName}
      />
    </div>
  );
}
