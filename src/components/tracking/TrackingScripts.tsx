"use client";

import * as React from "react";
import { buildScripts } from "@/lib/tracking/scripts";
import type { TrackingPixel } from "@/types/database";

const CONSENT_KEY = "cookie_consent";
const CONSENT_EVENT = "thryve:consent-change";

type ConsentState = "accepted" | "rejected" | null;

function readConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(CONSENT_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

/**
 * Client gate that only injects pixel <Script> tags when the visitor has
 * accepted cookies. Listens for both the cross-tab `storage` event and a
 * custom `thryve:consent-change` event so a click on the consent banner in
 * the same tab takes effect immediately without a reload.
 */
export function TrackingScripts({ pixels }: { pixels: TrackingPixel[] }) {
  const [consent, setConsent] = React.useState<ConsentState>(null);

  React.useEffect(() => {
    setConsent(readConsent());

    function update() {
      setConsent(readConsent());
    }
    window.addEventListener("storage", update);
    window.addEventListener(CONSENT_EVENT, update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(CONSENT_EVENT, update);
    };
  }, []);

  if (consent !== "accepted") return null;

  return (
    <>
      {pixels.map((pixel) => (
        <React.Fragment key={pixel.id}>{buildScripts(pixel)}</React.Fragment>
      ))}
    </>
  );
}
