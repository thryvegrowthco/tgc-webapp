// "Add to calendar" link builders. Pure, no network, no Google API.
//
// These work even when the Google Calendar integration is disconnected: they
// let a client drop a confirmed session onto their own calendar via a Google
// Calendar template URL or a downloadable RFC 5545 `.ics` file. They are a
// client-side convenience, separate from the server-side Google Calendar event
// Rachel's account creates (which also carries the Meet link).

import { meetingLocationLine } from "@/lib/booking/display";

const ORGANIZER_NAME = "Rachel Dietz";
const ORGANIZER_EMAIL = "hello@thryvegrowth.co";

/** Format an ISO instant as an RFC 5545 UTC timestamp: `YYYYMMDDTHHMMSSZ`. */
function toIcsUtc(iso: string): string {
  // "2026-11-03T15:30:00.000Z" -> "20261103T153000Z"
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape a TEXT value per RFC 5545 section 3.3.11 (`\ ; ,` and newlines). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold a content line to <= 75 octets per RFC 5545 section 3.1. Continuation
 * lines begin with a single space (which counts toward the 75-octet budget).
 * Splits only between whole code points so multi-byte UTF-8 is never broken.
 */
function foldLine(line: string): string {
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const ch of line) {
    const chBytes = Buffer.byteLength(ch, "utf8");
    if (currentBytes + chBytes > 75) {
      out.push(current);
      current = " " + ch; // leading space marks a continuation line
      currentBytes = 1 + chBytes;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }
  out.push(current);
  return out.join("\r\n");
}

export interface GoogleTemplateArgs {
  title: string;
  startIso: string;
  endIso: string;
  details?: string;
  location?: string;
}

/** Build a Google Calendar "add event" template URL (opens a pre-filled event). */
export function googleCalendarTemplateUrl(args: GoogleTemplateArgs): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: args.title,
    dates: `${toIcsUtc(args.startIso)}/${toIcsUtc(args.endIso)}`,
  });
  if (args.details) params.set("details", args.details);
  if (args.location) params.set("location", args.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export interface BuildIcsArgs {
  uid: string;
  title: string;
  startIso: string;
  endIso: string;
  description?: string;
  location?: string;
  url?: string;
  /** DTSTAMP override (ISO). Defaults to now. Pass for deterministic output. */
  stampIso?: string;
  /** LAST-MODIFIED override (ISO), e.g. the booking's updated_at. Defaults to stampIso / now. */
  lastModifiedIso?: string;
}

/** Build a single-event RFC 5545 VCALENDAR string (CRLF, UTC, folded). */
export function buildIcs(args: BuildIcsArgs): string {
  const stamp = toIcsUtc(args.stampIso ?? new Date().toISOString());
  const lastModified = toIcsUtc(args.lastModifiedIso ?? args.stampIso ?? new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Thryve Growth Co.//Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(args.uid)}`,
    `DTSTAMP:${stamp}`,
    `LAST-MODIFIED:${lastModified}`,
    "SEQUENCE:0",
    `DTSTART:${toIcsUtc(args.startIso)}`,
    `DTEND:${toIcsUtc(args.endIso)}`,
    `SUMMARY:${escapeText(args.title)}`,
    `ORGANIZER;CN=${ORGANIZER_NAME}:mailto:${ORGANIZER_EMAIL}`,
    ...(args.description ? [`DESCRIPTION:${escapeText(args.description)}`] : []),
    ...(args.location ? [`LOCATION:${escapeText(args.location)}`] : []),
    // URL is a URI value, not TEXT — it must not be backslash-escaped (that
    // would corrupt query strings like `?t=...`). Only line folding applies.
    ...(args.url ? [`URL:${args.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // Trailing CRLF so the final line is properly terminated.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export interface SessionCalendarInput {
  serviceType: string;
  /** Session start as a UTC ISO instant. */
  sessionAtIso: string;
  durationMinutes: number;
  locationType: string;
  locationDetails: string | null;
  meetLink: string | null;
  /** Client session workspace URL (empty for no-account sessions). */
  workspaceUrl: string | null;
}

export interface SessionCalendar {
  title: string;
  startIso: string;
  endIso: string;
  details: string;
  location: string;
  googleUrl: string;
}

/** Client-facing event title shared by the Google URL, the .ics, and the UI. */
export function sessionCalendarTitle(serviceType: string): string {
  return `${serviceType} with ${ORGANIZER_NAME} (Thryve Growth Co.)`;
}

/**
 * Derive the shared "add to calendar" fields for a session. The `location`
 * is the Meet link for Google Meet sessions, otherwise the human where-line
 * (phone / address / instructions). `details` repeats that plus the workspace
 * link so the event is useful on its own.
 */
export function buildSessionCalendar(input: SessionCalendarInput): SessionCalendar {
  const title = sessionCalendarTitle(input.serviceType);
  const startIso = new Date(input.sessionAtIso).toISOString();
  const endIso = new Date(
    new Date(input.sessionAtIso).getTime() + input.durationMinutes * 60_000
  ).toISOString();

  const whereLine = meetingLocationLine(input.locationType, input.locationDetails);
  const isMeet = (input.locationType || "google_meet") === "google_meet";
  const location = isMeet ? input.meetLink ?? "" : whereLine;

  const detailLines: string[] = [];
  if (isMeet && input.meetLink) {
    detailLines.push(`Google Meet: ${input.meetLink}`);
  } else if (whereLine) {
    detailLines.push(whereLine);
  }
  if (input.workspaceUrl) {
    detailLines.push(`Your session workspace: ${input.workspaceUrl}`);
  }
  const details = detailLines.join("\n");

  return {
    title,
    startIso,
    endIso,
    details,
    location,
    googleUrl: googleCalendarTemplateUrl({ title, startIso, endIso, details, location }),
  };
}
