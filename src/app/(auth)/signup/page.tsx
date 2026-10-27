import type { Metadata } from "next";
import Link from "next/link";
import { LogoWordmark } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Accounts are by invitation",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <LogoWordmark />
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-neutral-900">
              Accounts are by invitation
            </h1>
            <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
              Client accounts are set up by Rachel after your free consultation.
              If you already received an invitation email, use the link in that
              email to set your password.
            </p>
          </div>

          <Button asChild size="lg" className="w-full">
            <Link href="/consultation">Book a free 30-minute consultation</Link>
          </Button>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-brand-700 font-medium hover:text-brand-800"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          <Link href="/" className="hover:text-neutral-600">
            ← Back to thryvegrowth.co
          </Link>
        </p>
      </div>
    </div>
  );
}
