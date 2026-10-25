import { redirect } from "next/navigation";

// The client-facing bookings list is now "My Sessions" at /dashboard/sessions.
// This route is kept as a permanent redirect so older emails and bookmarks that
// point at /dashboard/bookings still land in the right place.
export default function BookingsRedirectPage() {
  redirect("/dashboard/sessions");
}
