import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/booking/slots?month=2025-04
// Returns available dates and their slot counts for the calendar.
// GET /api/booking/slots?date=2025-04-14
// Returns available time slots for a specific date.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // "YYYY-MM"
  const date = searchParams.get("date");   // "YYYY-MM-DD"

  const supabase = await createClient();

  if (date) {
    // Return time slots for a specific date
    const { data, error } = await supabase
      .from("availability_slots")
      .select("id, start_time, end_time, service_type")
      .eq("slot_date", date)
      .eq("is_booked", false)
      .order("start_time");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ slots: data });
  }

  if (month) {
    // Return all available dates in the month (just the dates, not full slot details)
    const [year, mon] = month.split("-").map(Number);
    const firstDay = new Date(year, mon - 1, 1).toISOString().split("T")[0];
    const lastDay = new Date(year, mon, 0).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("availability_slots")
      .select("slot_date")
      .eq("is_booked", false)
      .gte("slot_date", firstDay)
      .lte("slot_date", lastDay);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return unique dates that have available slots
    const availableDates = [...new Set(data?.map((s) => s.slot_date) ?? [])];

    return NextResponse.json({ availableDates });
  }

  return NextResponse.json({ error: "Provide ?month=YYYY-MM or ?date=YYYY-MM-DD" }, { status: 400 });
}
