import { CalendarPlus, Download } from "lucide-react";

/**
 * Two small "add to calendar" links for a confirmed session: a Google Calendar
 * template URL and a downloadable `.ics` (Apple / Outlook). Purely presentational
 * (renders anchors), so it works in a server component with no client JS.
 */
export function AddToCalendarLinks({
  googleUrl,
  icsUrl,
  className,
}: {
  googleUrl: string;
  icsUrl: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-brand-300 hover:text-brand-700 transition-colors"
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Add to Google Calendar
        </a>
        <a
          href={icsUrl}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-brand-300 hover:text-brand-700 transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Download calendar file (.ics)
        </a>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        If you already accepted Rachel&apos;s calendar invite, you don&apos;t need these.
      </p>
    </div>
  );
}
