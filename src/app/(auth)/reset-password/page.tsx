"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { LogoWordmark } from "@/components/shared/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/app/actions/auth";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <LogoWordmark />
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-neutral-900">
              Reset your password
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {state.error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          {state.success ? (
            <div className="rounded-lg bg-brand-50 border border-brand-200 px-4 py-4 text-sm text-brand-800">
              <p className="font-semibold mb-1">Check your email</p>
              <p>{state.success}</p>
              <Link
                href="/login"
                className="inline-block mt-3 text-brand-700 font-medium hover:text-brand-800"
              >
                Back to sign in →
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={pending}
              >
                {pending ? "Sending…" : "Send Reset Link"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-neutral-500">
            Remember your password?{" "}
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
