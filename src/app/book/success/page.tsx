import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stripe } from "@/lib/stripe/client";

export const metadata: Metadata = {
  title: "Booking Confirmed",
  description: "Your booking with Thryve Growth Co. is confirmed.",
  robots: { index: false, follow: false },
};

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function BookingSuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id } = await searchParams;

  let serviceType = "your session";
  let customerEmail = "";

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      serviceType = (session.metadata?.serviceType as string) ?? serviceType;
      customerEmail = session.customer_email ?? "";
    } catch {
      // Session not found or invalid — still show success page
    }
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center py-20 bg-gradient-to-br from-brand-50 via-white to-brand-50">
      <div className="mx-auto max-w-lg px-4 text-center">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-brand-600" />
        </div>

        <h1 className="font-display text-3xl font-bold text-neutral-900 mb-3">
          You&apos;re booked!
        </h1>

        <p className="text-neutral-600 leading-relaxed mb-4">
          Your{" "}
          <span className="font-semibold text-neutral-800">{serviceType}</span>{" "}
          session is confirmed. I&apos;m looking forward to our conversation.
        </p>

        {customerEmail && (
          <p className="text-sm text-neutral-500 mb-8">
            A confirmation has been sent to{" "}
            <span className="font-medium text-neutral-700">{customerEmail}</span>.
          </p>
        )}

        {/* What happens next */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-left mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-4">
            What happens next
          </p>
          <ol className="space-y-3">
            {[
              "Check your email for booking confirmation details",
              "You'll receive a video call link before your session",
              "If you need to reschedule, reply to the confirmation email",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-neutral-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/dashboard/bookings">
              <Calendar className="h-4 w-4" />
              View My Bookings
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              Back to Home
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
