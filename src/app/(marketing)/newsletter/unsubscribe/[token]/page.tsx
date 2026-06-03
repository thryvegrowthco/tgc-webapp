import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { UnsubscribeForm } from "@/components/marketing/UnsubscribeForm";

export const metadata: Metadata = {
  title: "Unsubscribed — Thryve Growth Co.",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function UnsubscribePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Look up the subscriber; if not found, show a generic message.
  const { data: rawRow } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, first_name, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  const sub = rawRow as {
    id: string;
    email: string;
    first_name: string | null;
    unsubscribed_at: string | null;
  } | null;

  // Idempotently mark unsubscribed (visiting this page is the user's confirmation)
  if (sub && !sub.unsubscribed_at) {
    const now = new Date().toISOString();
    await supabase
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: now })
      .eq("id", sub.id);
    await supabase.from("newsletter_events").insert({
      subscriber_id: sub.id,
      event_type: "unsubscribed",
      occurred_at: now,
    });
  }

  return (
    <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 min-h-[60vh] py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 sm:p-10">
          {sub ? (
            <>
              <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">
                You&apos;ve been unsubscribed.
              </h1>
              <p className="text-neutral-600 mb-6 leading-relaxed">
                {sub.email} won&apos;t receive any more Thryve newsletters. No hard feelings — life gets busy.
                If you change your mind, you can <Link href="/newsletter" className="text-brand-700 underline underline-offset-4">resubscribe anytime</Link>.
              </p>

              <div className="border-t border-neutral-100 pt-6">
                <UnsubscribeForm subscriberId={sub.id} firstName={sub.first_name} />
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">
                Link expired or invalid
              </h1>
              <p className="text-neutral-600 mb-6 leading-relaxed">
                We couldn&apos;t find a subscription matching this link. You might already be unsubscribed, or the link is from an old email.
              </p>
              <p className="text-sm text-neutral-500">
                If you&apos;re still getting emails and want to stop, just reply to one and we&apos;ll handle it manually:{" "}
                <a href="mailto:hello@thryvegrowth.co" className="text-brand-700 underline underline-offset-4">
                  hello@thryvegrowth.co
                </a>.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
