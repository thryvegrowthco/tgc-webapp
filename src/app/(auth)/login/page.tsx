"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { LogoWordmark } from "@/components/shared/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { logIn } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(logIn, {});

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <LogoWordmark />
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-neutral-900">
              Welcome back
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Sign in to your Thryve Growth Co. account.
            </p>
          </div>

          {state.error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/reset-password"
                  className="text-xs text-brand-700 hover:text-brand-800 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-brand-700 font-medium hover:text-brand-800"
            >
              Create one
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
