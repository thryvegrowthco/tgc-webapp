"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "cookie_consent";
const CONSENT_EVENT = "thryve:consent-change";

type Decision = "accepted" | "rejected";

function persist(decision: Decision): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, decision);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: decision }));
  } catch {
    // localStorage may be blocked in private/strict-cookie modes — silently
    // fall back to "no consent recorded" which keeps tracking off.
  }
}

/**
 * Bottom-anchored cookie consent bar. Renders only when no decision has been
 * recorded. Accept → tracking pixels fire. Reject → they stay off.
 *
 * Height is the design: on a phone this sits over the bottom of every page until
 * the visitor chooses, so it is one line of copy and two equal buttons (about
 * 129px at 390px wide), not a card. It is welded to the bottom edge so anything
 * the browser floats there overlaps padding rather than a control, and it sits
 * below the mobile nav drawer (z-40) rather than over it.
 *
 * The copy stays purpose-generic on purpose: /privacy enumerates the live
 * providers with per-provider opt-outs, and that list changes when Rachel toggles
 * one in /admin/integrations, while this sentence does not have to.
 *
 * Uses two render passes (initial null + post-mount read) to stay
 * hydration-safe — the server emits nothing, the client decides once mounted.
 */
export function CookieConsent() {
  const [mounted, setMounted] = React.useState(false);
  const [hasDecision, setHasDecision] = React.useState(true);

  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem(CONSENT_KEY);
      setHasDecision(stored === "accepted" || stored === "rejected");
    } catch {
      // localStorage blocked — treat as decided (don't pester the user).
      setHasDecision(true);
    }
  }, []);

  if (!mounted || hasDecision) return null;

  function handleAccept() {
    persist("accepted");
    setHasDecision(true);
  }

  function handleReject() {
    persist("rejected");
    setHasDecision(true);
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-muted pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] shadow-[0_-2px_12px_rgba(14,29,25,0.08)] print:hidden"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-8">
        <p className="pr-11 text-sm text-neutral-700 sm:pr-0">
          Cookies help us see how this site is used. The site works either way.{" "}
          <Link
            href="/privacy"
            className="-my-3 inline-block whitespace-nowrap py-3 font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            Learn more
          </Link>
        </p>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <Button onClick={handleAccept} className="w-full sm:w-auto">
            Accept
          </Button>
          <Button variant="outline" onClick={handleReject} className="w-full sm:w-auto">
            Reject
          </Button>
          {/* Same decision as Reject, in the corner where a banner's close control
              belongs. Absolute on a phone so it never steals width from the copy. */}
          <button
            type="button"
            onClick={handleReject}
            aria-label="Dismiss and decline cookies"
            className="absolute right-1 top-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-neutral-500 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:static"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
