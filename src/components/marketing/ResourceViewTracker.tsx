"use client";

import * as React from "react";

// Fires a single "view" beacon for the resources shown on the page, de-duped
// per browser session via sessionStorage so repeated navigations don't inflate
// the count. Renders nothing.
export function ResourceViewTracker({ ids }: { ids: string[] }) {
  const key = ids.join(",");
  React.useEffect(() => {
    const list = key ? key.split(",") : [];
    const fresh: string[] = [];
    for (const id of list) {
      const k = `rv:${id}`;
      try {
        if (!sessionStorage.getItem(k)) {
          fresh.push(id);
          sessionStorage.setItem(k, "1");
        }
      } catch {
        // private mode / storage disabled — just skip de-dup
        fresh.push(id);
      }
    }
    if (fresh.length === 0) return;
    const payload = JSON.stringify({ ids: fresh });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/resources/view", new Blob([payload], { type: "application/json" }));
      } else {
        void fetch("/api/resources/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      // ignore — analytics must never break the page
    }
  }, [key]);

  return null;
}
