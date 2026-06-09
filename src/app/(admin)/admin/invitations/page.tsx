// Admin list of booking invitations Rachel has created. Enhances — does not
// duplicate — the Sessions section: invitations are the "offer a time" stage
// that precedes a real session (booking) once the client picks.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCentralDate, formatCentralTime } from "@/lib/time/central";
import { meetingTypeLabel } from "@/lib/booking/display";
import { InvitationRowActions } from "@/components/admin/InvitationRowActions";

export const metadata: Metadata = {
  title: "Booking Invitations — Admin",
  robots: { index: false, follow: false },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-600 border-neutral-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  accepted: "bg-green-100 text-green-700 border-green-200",
  expired: "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

type InvitationRow = {
  id: string;
  token: string;
  client_email: string;
  client_name: string | null;
  service_type: string;
  location_type: string;
  requires_payment: boolean;
  status: string;
  expires_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  booking_id: string | null;
  client_id: string | null;
  created_at: string;
};

export default async function AdminInvitationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/invitations");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  const { data: rows } = await supabase
    .from("booking_invitations")
    .select(
      "id, token, client_email, client_name, service_type, location_type, requires_payment, status, expires_at, sent_at, accepted_at, booking_id, client_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const invitations = (rows ?? []) as InvitationRow[];

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Booking invitations</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Offer date and time options. When a client picks one, a session is created automatically.
          </p>
        </div>
        <Link
          href="/admin/invitations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> New invitation
        </Link>
      </div>

      {invitations.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <Mail className="h-6 w-6 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No invitations yet.</p>
          <Link href="/admin/invitations/new" className="text-sm text-brand-700 hover:underline mt-2 inline-block">
            Send your first booking invitation
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {invitations.map((inv) => {
            const badge = STATUS_BADGE[inv.status] ?? STATUS_BADGE.pending;
            const expired =
              inv.status !== "accepted" &&
              inv.status !== "cancelled" &&
              inv.expires_at &&
              new Date(inv.expires_at) < new Date();
            return (
              <div
                key={inv.id}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-neutral-900 text-sm truncate">
                      {inv.client_name || inv.client_email}
                    </p>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold border ${
                        expired ? STATUS_BADGE.expired : badge
                      }`}
                    >
                      {expired ? "expired" : inv.status}
                    </span>
                    {inv.requires_payment && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold border bg-brand-50 text-brand-700 border-brand-200">
                        paid
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {inv.service_type} · {meetingTypeLabel(inv.location_type)}
                    {inv.status === "accepted" && inv.accepted_at
                      ? ` · booked ${formatCentralDate(inv.accepted_at, { month: "short", day: "numeric" })} at ${formatCentralTime(inv.accepted_at)}`
                      : inv.sent_at
                        ? ` · sent ${formatCentralDate(inv.sent_at, { month: "short", day: "numeric" })}`
                        : " · not sent yet"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {inv.status === "accepted" && inv.booking_id && (
                    <Link
                      href={
                        inv.client_id
                          ? `/admin/clients/${inv.client_id}#booking-${inv.booking_id}`
                          : "/admin/sessions"
                      }
                      className="text-xs text-brand-700 hover:underline"
                    >
                      View session
                    </Link>
                  )}
                  <InvitationRowActions
                    invitationId={inv.id}
                    token={inv.token}
                    status={inv.status}
                    appUrl={APP_URL}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
