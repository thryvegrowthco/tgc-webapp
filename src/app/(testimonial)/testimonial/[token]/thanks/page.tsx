import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Thank You — Thryve Growth Co.",
  robots: { index: false, follow: false },
};

export default function TestimonialThanksPage() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
        <Heart className="h-6 w-6 text-rose-500" />
      </div>
      <h1 className="font-display text-2xl font-bold text-neutral-900">Thank you!</h1>
      <p className="text-neutral-600 mt-2">
        Your testimonial means so much. Rachel will review it, and it may appear on the site soon.
      </p>
      <div className="mt-6">
        <Link href="/" className="inline-block text-sm text-brand-700 hover:underline">
          Back to Thryve Growth Co.
        </Link>
      </div>
    </div>
  );
}
