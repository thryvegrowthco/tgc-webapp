"use client";

import * as React from "react";

// Renders a Mermaid diagram client-side. `mermaid` is dynamically imported so it
// lands in its own lazy chunk (admin help pages only) and never bloats the main
// bundle or the serverless functions. Falls back to the raw source if a diagram
// fails to parse, so a bad diagram never blanks the page.
export function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const rawId = React.useId();
  const id = "mmd-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (failed) {
    return (
      <pre className="my-4 overflow-x-auto rounded-lg bg-neutral-100 p-4 text-xs text-neutral-600">
        {chart}
      </pre>
    );
  }
  if (!svg) {
    return <div className="my-6 h-40 animate-pulse rounded-lg bg-neutral-100" aria-hidden="true" />;
  }
  return (
    <figure
      className="my-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 print:break-inside-avoid [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // Mermaid's own generated SVG from our committed docs — trusted input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
