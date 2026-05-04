"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

export async function createPortalSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: watchlist } = await supabase
    .from("watchlist_profiles")
    .select("stripe_subscription_id")
    .eq("client_id", user.id)
    .single();

  if (!watchlist?.stripe_subscription_id) {
    redirect("/dashboard/billing?error=no_subscription");
  }

  const subscription = await stripe.subscriptions.retrieve(watchlist.stripe_subscription_id);
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard/billing`,
  });

  redirect(session.url);
}
