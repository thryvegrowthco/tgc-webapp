# Booking Invitation → Session — Workflow Diagrams

Visual reference for the admin-initiated booking workflow. Open in VS Code's
Markdown preview (or any Mermaid-aware viewer) to render the diagrams.

---

## 1. End-to-end flow (creation → selection → finalize)

```mermaid
flowchart TD
    A["Rachel<br/>/admin/invitations/new<br/>(or 'Create booking invitation'<br/>on a client page)"]
      -->|createBookingInvitation| B[("booking_invitations<br/>+ booking_invitation_options<br/>(status = open)")]
    B -->|sendBookingInvitation| C["📧 'Choose a Time for Your Thryve Session'<br/>(booking_invitation template)"]
    C --> D["Client opens<br/>/book-session/&lt;token&gt;<br/>(public, no login)"]

    D --> E{Invitation state?}
    E -->|expired / already used / cancelled| F["Friendly closed state<br/>('reply for new times')"]
    E -->|valid| G["Branded slot selector<br/>(options shown in Central time)"]

    G --> H["Client picks ONE time"]
    H --> I{requires_payment?}

    I -->|No| J["acceptBookingInvitation<br/>reserve option (open → reserved)"]
    I -->|Yes| K["createInvitationCheckoutSession<br/>reserve option + Stripe Checkout<br/>expires_at = now + 2h"]
    K --> L["Stripe hosted checkout (test/live)"]
    L -->|payment completed| M["Webhook checkout.session.completed<br/>(metadata.flow = 'invitation')<br/>handleInvitationCheckoutCompleted"]

    J --> N{{"finalizeSession()  ⭐ SHARED CORE"}}
    M --> N

    N --> O["✅ /book-session/&lt;token&gt;/confirmed"]
    N --> P[("Session created — see diagram 2")]

    L -. abandoned (cancel_url) .-> Q["releaseReservedOptions<br/>(reserved → open)"]
    L -. abandoned (tab closed) .-> R["cron TTL sweep after 2h<br/>(reserved → open)"]
```

---

## 2. Inside finalizeSession() — both branches converge here

```mermaid
flowchart TD
    S["finalizeSession(args)"] --> T{Idempotency:<br/>stripe_session_id OR<br/>invitation.booking_id<br/>already finalized?}
    T -->|yes| U["return existing bookingId<br/>(no duplicate)"]
    T -->|no| V["Resolve client_id by email<br/>(link to portal account if one exists)"]
    V --> W{Overlap guard:<br/>another session at this time?}
    W -->|yes| X["error → (paid path) refund +<br/>release option + alert Rachel"]
    W -->|no| Y["INSERT bookings<br/>workflow_status = session_scheduled<br/>payment_status, duration, location"]
    Y -->|UNIQUE booking_invitation_id race| U
    Y --> Z["INSERT payments<br/>(only when paid)"]
    Z --> AA["Google Calendar event<br/>(Meet link if google_meet;<br/>else phone/in-person/custom location)"]
    AA -->|ok| AB["store meet_link + calendar_event_id"]
    AA -->|fail / not connected| AC["meet_link_pending = true<br/>('Meet link needed' badge)"]
    AB --> AD["Stamp invitation = accepted<br/>chosen option = consumed<br/>other options = withdrawn"]
    AC --> AD
    AD --> AE["🔔 admin bell: session_booked_via_invite"]
    AE --> AF["📧 client: 'Your Thryve Session is Confirmed'"]
    AF --> AG["📧 Rachel: 'New Session Booked'"]
    AG --> AH["Appears in /admin/sessions<br/>+ /dashboard/sessions/&lt;id&gt; (if account)"]
```

---

## 3. Automated reminders (hourly session-reminders cron)

```mermaid
flowchart LR
    CR["⏰ /api/cron/session-reminders<br/>(hourly)"] --> A24{"~24h before?<br/>(reminder not sent)"}
    CR --> A1{"~1h before?<br/>(reminder not sent)"}
    CR --> A2{"~2h before?<br/>(prep not sent)"}
    CR --> SW["Reservation TTL sweep:<br/>release holds > 2h old<br/>on unaccepted invitations"]
    A24 -->|yes| R24["📧 client: 'We're meeting tomorrow'<br/>+ 🔔 Rachel bell"]
    A1 -->|yes| R1["📧 client: 'Starting soon'"]
    A2 -->|yes| R2["📧 Rachel: prep summary"]
```

---

## 4. Managing a session (admin) — Manage panel + Upcoming widget

```mermaid
flowchart TD
    MG["Client detail page → booking → 'Manage'<br/>(or Upcoming Sessions widget on /admin)"]
    MG --> ST["updateSession:<br/>status (incl. no-show), payment,<br/>summary, next steps, follow-up flag"]
    MG --> RM["sendSessionReminderNow<br/>('starting soon' on demand)"]
    MG --> RS["rescheduleSession(date, time)"]
    MG --> CN["cancelSession"]

    RS --> RS1["recompute session_at +<br/>overlap guard"]
    RS1 --> RS2["PATCH Google Calendar event<br/>(or recreate, delete stale)"]
    RS2 --> RS3["reset reminder flags + clear<br/>automation_log → reminders re-fire"]
    RS3 --> RS4["📧 client: updated confirmation"]

    CN --> CN1["workflow_status = cancelled<br/>+ delete calendar event"]
```

---

## 5. Session status lifecycle (workflow_status)

```mermaid
stateDiagram-v2
    [*] --> session_scheduled: invitation accepted (finalizeSession)
    [*] --> intake_needed: paid /book flow
    intake_needed --> intake_complete: client submits intake
    intake_complete --> session_scheduled: Rachel reviews
    session_scheduled --> completed: session happens (auto-complete cron / Manage)
    session_scheduled --> no_show: client didn't attend (Manage)
    session_scheduled --> rescheduled: moved to new time
    session_scheduled --> cancelled: cancelSession
    completed --> follow_up_sent: post-service follow-up cron
    follow_up_sent --> [*]
    cancelled --> [*]
    no_show --> [*]
```

---

### Key guarantees baked in
- **One invitation → one session** (UNIQUE `booking_invitation_id`; finalize is idempotent on the `23505` race).
- **No double-booking** at the same time (atomic option reserve + cross-session overlap guard).
- **No charge without a session** (paid-finalize conflict → automatic refund + admin alert).
- **Calendar/email never block a booking** (best-effort; failures surface as `meet_link_pending`).
- **All times Central (America/Chicago)** with DST handled by `localCentralToUtcIso`.
