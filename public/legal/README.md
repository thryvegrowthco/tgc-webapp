# Legal documents

`service-agreement.pdf` lives in this directory.

It is referenced by the clickwrap checkbox in the booking flow
(`src/components/booking/BookingFlow.tsx`).

The starter draft Markdown source lives at
`docs/service-agreement-draft.md`. After you finalize the language, export
that draft to a PDF and save it here as `service-agreement.pdf`.

Bump `NEXT_PUBLIC_CONTRACT_VERSION` in `.env.local` and on Vercel whenever the
meaningful terms change. The version that was current at booking time is
recorded on the booking row (`bookings.contract_version`) — it's the legal
record of what each client agreed to.
