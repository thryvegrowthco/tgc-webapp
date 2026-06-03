import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { ManagePreferencesForm } from "@/components/marketing/ManagePreferencesForm";

export const metadata: Metadata = {
  title: "Manage your subscription — Thryve Growth Co.",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ManagePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: rawRow } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, first_name, interests, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  const sub = rawRow as {
    id: string;
    email: string;
    first_name: string | null;
    interests: string[];
    unsubscribed_at: string | null;
  } | null;

  return (
    <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 min-h-[60vh] py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 sm:p-10">
          {sub ? (
            <ManagePreferencesForm
              token={token}
              email={sub.email}
              firstName={sub.first_name}
              interests={sub.interests ?? []}
              unsubscribed={sub.unsubscribed_at !== null}
            />
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">
                Link not found
              </h1>
              <p className="text-neutral-600">
                This preferences link is no longer valid. <Link href="/newsletter" className="text-brand-700 underline underline-offset-4">Resubscribe here</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
