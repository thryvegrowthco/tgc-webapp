// GoHighLevel API client — contact sync on signup and booking

const GHL_BASE = "https://rest.gohighlevel.com/v1";

interface GHLContact {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  tags?: string[];
  customField?: Record<string, string>;
}

async function ghlRequest(path: string, body: Record<string, unknown>) {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.warn("[GHL] Missing GHL_API_KEY or GHL_LOCATION_ID — skipping sync");
    return null;
  }

  const res = await fetch(`${GHL_BASE}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, locationId }),
  });

  if (!res.ok) {
    console.error(`[GHL] Request failed: ${res.status} ${res.statusText}`);
    return null;
  }

  return res.json();
}

export async function syncContactToGHL(contact: GHLContact): Promise<string | null> {
  const nameParts = contact.firstName.split(" ");
  const firstName = nameParts[0];
  const lastName = contact.lastName ?? nameParts.slice(1).join(" ") ?? "";

  const result = await ghlRequest("/contacts/upsert", {
    firstName,
    lastName,
    email: contact.email,
    phone: contact.phone,
    tags: contact.tags ?? ["thryve-client"],
    customField: contact.customField,
  });

  return result?.contact?.id ?? null;
}

export async function syncBookingToGHL(data: {
  clientEmail: string;
  clientName: string;
  serviceType: string;
}) {
  return syncContactToGHL({
    firstName: data.clientName,
    email: data.clientEmail,
    tags: ["thryve-client", "booked"],
    customField: { last_service_booked: data.serviceType },
  });
}

export async function syncNewsletterSubscriber(data: {
  email: string;
  firstName?: string;
}) {
  return syncContactToGHL({
    firstName: data.firstName ?? "",
    email: data.email,
    tags: ["thryve-newsletter"],
  });
}
