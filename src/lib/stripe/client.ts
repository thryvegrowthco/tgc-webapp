import Stripe from "stripe";

// Server-only Stripe client — never import this in client components.
// Lazy singleton so the module can be imported without STRIPE_SECRET_KEY at build time.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Named export kept for backwards-compat with existing imports.
// Uses a Proxy so the client is only instantiated on first property access.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
