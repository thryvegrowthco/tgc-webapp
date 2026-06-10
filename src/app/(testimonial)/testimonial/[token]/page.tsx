import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { TestimonialForm } from "@/components/testimonial/TestimonialForm";

export const metadata: Metadata = {
  title: "Share Your Experience — Thryve Growth Co.",
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
        Questions? Write to{" "}
        <a href="mailto:hello@thryvegrowth.co" className="text-brand-700 underline underline-offset-4">
          hello@thryvegrowth.co
        </a>
        .
      </p>
    </Card>
  );
}

export default async function TestimonialSubmitPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, client_id, service_type")
    .eq("testimonial_token", token)
    .maybeSingle();

  if (!booking) {
    return (
      <ClosedState
        heading="We couldn't find this link"
        body="It may be from an old email, or the address was mistyped. If you'd like to share a testimonial, just reply to Rachel's email."
      />
    );
  }

  // Already submitted? Show a gracious thank-you instead of a second form.
  const { data: existing } = await supabase
    .from("testimonials")
    .select("id")
    .eq("booking_id", booking.id)
    .maybeSingle();
  if (existing) {
    return (
      <ClosedState
        heading="You've already shared your thoughts"
        body="Thank you so much — we've received your testimonial and truly appreciate you taking the time."
      />
    );
  }

  // Prefill the author name from the client's profile (editable on the form).
  let prefillName = "";
  if (booking.client_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", booking.client_id)
      .maybeSingle();
    prefillName = (profile as { full_name: string | null } | null)?.full_name ?? "";
  }

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          How was your experience?
        </h1>
        <p className="text-neutral-600 mt-2 leading-relaxed">
          {booking.service_type ? (
            <>If your <span className="font-medium text-neutral-800">{booking.service_type}</span> was helpful, </>
          ) : (
            "If working together was helpful, "
          )}
          a short testimonial means the world — and helps others find the support they need. It takes about a minute.
        </p>
      </Card>

      <Card>
        <TestimonialForm token={token} prefillName={prefillName} />
      </Card>
    </div>
  );
}
