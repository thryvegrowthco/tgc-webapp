"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";

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
 * Bottom-left cookie consent banner. Renders only when no decision has been
 * recorded. Accept → tracking pixels fire. Reject → they stay off.
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
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-body"
      className="fixed bottom-4 left-4 right-4 sm:right-auto z-50 max-w-md rounded-2xl border border-brand-200 bg-white p-5 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p
            id="cookie-consent-title"
            className="font-display text-base font-semibold text-neutral-900"
          >
            Mind a few cookies?
          </p>
          <p
            id="cookie-consent-body"
            className="text-sm text-neutral-600 leading-relaxed mt-1"
          >
            We use analytics and ad cookies to understand how the site is used
            and to improve it. You can decline — the site works either way.{" "}
            <Link href="/privacy" className="text-brand-700 underline hover:text-brand-800">
              Learn more
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={handleReject}
          aria-label="Dismiss and decline cookies"
          className="text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleAccept}
          className="inline-flex items-center justify-center rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={handleReject}
          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
