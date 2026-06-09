import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCentralDate, formatCentralTime } from "@/lib/time/central";
import { meetingTypeLabel, formatDuration } from "@/lib/booking/display";
import { releaseReservedOptions } from "@/app/actions/booking-invitations";
import {
  InvitationSlotSelector,
  type SelectorOption,
} from "@/components/booking/InvitationSlotSelector";

export const metadata: Metadata = {
  title: "Choose a Time for Your Thryve Session",
  robots: { index: false, follow: false },
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8">
      {children}
    </div>
  );
}

function ClosedState({ heading, body }: { heading: string; body: string }) {
  return (
    <Card>
      <h1 className="font-display text-xl font-bold text-neutral-900 mb-2">{heading}</h1>
      <p className="text-neutral-600 leading-relaxed">{body}</p>
      <p className="text-sm text-neutral-500 mt-4">
        Questions? Reply to Rachel&apos;s email or write to{" "}
        <a href="mailto:hello@thryvegrowth.co" className="text-brand-700 underline underline-offset-4">
          hello@thryvegrowth.co
        </a>
        .
      </p>
    </Card>
  );
}

export default async function BookSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { token } = await params;
  const { cancelled } = await searchParams;
  const supabase = createServiceClient();

  // Returning from an abandoned Stripe checkout — release the held option.
  if (cancelled) {
    await releaseReservedOptions(token);
  }

  const { data: invRaw } = await supabase
    .from("booking_invitations")
    .select(
      "id, status, expires_at, booking_id, requires_payment, amount_cents, service_type, session_type, duration_minutes, location_type, location_details, client_name, custom_message"
    )
    .eq("token", token)
    .maybeSingle();

  const inv = invRaw as {
    id: string;
    status: string;
    expires_at: string | null;
    booking_id: string | null;
    requires_payment: boolean;
    amount_cents: number | null;
    service_type: string;
    session_type: string | null;
    duration_minutes: number;
    location_type: string;
    location_details: string | null;
    client_name: string | null;
    custom_message: string | null;
  } | null;

  if (!inv) {
    return (
      <ClosedState
        heading="Booking link not found"
        body="We couldn't find this booking link. It may be from an old email, or the address was mistyped."
      />
    );
  }
  if (inv.status === "accepted" || inv.booking_id) {
    return (
      <ClosedState
        heading="You're already booked"
        body="This invitation has already been used to schedule a session. Check your email for the confirmation, or reach out if you need to make a change."
      />
    );
  }
  if (inv.status === "cancelled") {
    return (
      <ClosedState
        heading="This invitation was cancelled"
        body="Reply to Rachel's email and she'll send over a fresh set of times."
      />
    );
  }
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return (
      <ClosedState
        heading="This invitation has expired"
        body="No problem — reply to Rachel's email and she'll send a few new times that work."
      />
    );
  }

  const { data: optRows } = await supabase
    .from("booking_invitation_options")
    .select("id, session_at")
    .eq("invitation_id", inv.id)
    .eq("status", "open")
    .order("session_at", { ascending: true });

  const options: SelectorOption[] = (optRows ?? []).map((o) => ({
    id: o.id,
    dateLabel: formatCentralDate(o.session_at),
    timeLabel: formatCentralTime(o.session_at),
  }));

  if (options.length === 0) {
    return (
      <ClosedState
        heading="These times are no longer available"
        body="It looks like the offered times were just taken. Reply to Rachel's email and she'll send new options."
      />
    );
  }

  const amountLabel =
    inv.requires_payment && inv.amount_cents
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
          inv.amount_cents / 100
        )
      : null;

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          Hi{inv.client_name ? ` ${inv.client_name.split(" ")[0]}` : " there"}, let&apos;s find a time
        </h1>
        <p className="text-neutral-600 mt-2 leading-relaxed">
          {inv.custom_message?.trim() ||
            "I'm excited to get your session scheduled. Choose the date and time that works best for you below."}
        </p>

        <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/60 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-neutral-500">Service</dt>
            <dd className="text-sm font-medium text-neutral-900 mt-0.5">{inv.service_type}</dd>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-neutral-500">Length</dt>
            <dd className="text-sm font-medium text-neutral-900 mt-0.5">
              {formatDuration(inv.duration_minutes)}
            </dd>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-neutral-500">Meeting</dt>
            <dd className="text-sm font-medium text-neutral-900 mt-0.5">
              {meetingTypeLabel(inv.location_type)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold text-neutral-900 mb-1">Choose your time</h2>
        <p className="text-sm text-neutral-500 mb-4">All times are shown in Central Time (CT).</p>
        <InvitationSlotSelector
          token={token}
          options={options}
          requiresPayment={inv.requires_payment}
          amountLabel={amountLabel}
        />
      </Card>

      <p className="text-center text-xs text-neutral-400">
        If none of these work,{" "}
        <Link href="mailto:hello@thryvegrowth.co" className="text-brand-600 underline underline-offset-4">
          reply to the email
        </Link>{" "}
        and Rachel will send more options.
      </p>
    </div>
  );
}
