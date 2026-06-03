-- Thryve Growth Co. — Service Agreement system
--
-- Replaces the static /legal/service-agreement.pdf clickwrap with an
-- admin-editable HTML agreement that clients sign during onboarding.
-- Each client's signed copy is immutable and viewable by Rachel.
--
-- Tables:
--   service_agreements       — versioned editable templates (one is_current)
--   signed_service_agreements — per-client immutable signing records
--
-- The migration seeds v1 from docs/service-agreement-draft.md as Tiptap
-- ProseMirror JSON so Rachel can immediately edit it in the admin editor.

-- ─── service_agreements ───────────────────────────────────────────────────────
CREATE TABLE service_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_label TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one row may be the current one at a time.
CREATE UNIQUE INDEX service_agreements_one_current_idx
  ON service_agreements(is_current) WHERE is_current = TRUE;

CREATE INDEX service_agreements_created_at_idx
  ON service_agreements(created_at DESC);

ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;

-- Admins manage all
CREATE POLICY "service_agreements_admin" ON service_agreements
  FOR ALL USING (is_admin());

-- Authenticated users may read the current published version (for signing
-- during onboarding and viewing on the public route).
CREATE POLICY "service_agreements_read_current" ON service_agreements
  FOR SELECT USING (is_current = TRUE);

-- ─── signed_service_agreements ────────────────────────────────────────────────
-- Immutable per-client signing record. Once written, never updated.
CREATE TABLE signed_service_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES service_agreements(id) ON DELETE RESTRICT,
  version_label TEXT NOT NULL,
  content_snapshot JSONB NOT NULL,
  signed_full_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT
);

CREATE INDEX signed_service_agreements_client_signed_idx
  ON signed_service_agreements(client_id, signed_at DESC);
CREATE INDEX signed_service_agreements_agreement_idx
  ON signed_service_agreements(agreement_id);

ALTER TABLE signed_service_agreements ENABLE ROW LEVEL SECURITY;

-- Clients see their own signing records; admins see all.
CREATE POLICY "signed_agreements_select_own" ON signed_service_agreements
  FOR SELECT USING (auth.uid() = client_id OR is_admin());

-- Admins can manage everything (including reviewing/deleting if absolutely
-- needed). Inserts in normal app flow happen through the service-role server
-- action to bypass the per-client SELECT scope.
CREATE POLICY "signed_agreements_admin" ON signed_service_agreements
  FOR ALL USING (is_admin());

-- ─── Seed v1 ──────────────────────────────────────────────────────────────────
-- ProseMirror JSON corresponding to the 12-section draft in
-- docs/service-agreement-draft.md. The {{ }} markers remain as plain text so
-- Rachel can edit them inline (e.g. the governing-law state, effective date).
INSERT INTO service_agreements (version_label, title, content, is_current, published_at)
VALUES (
  'v1',
  'Thryve Growth Co. — Service Agreement',
  $$
  {
    "type": "doc",
    "content": [
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Thryve Growth Co. — Service Agreement" }] },
      { "type": "paragraph", "content": [
        { "type": "text", "marks": [{ "type": "bold" }], "text": "Effective: " },
        { "type": "text", "text": "{{ DATE YOU FINALIZE THIS }}" }
      ]},
      { "type": "paragraph", "content": [
        { "type": "text", "marks": [{ "type": "bold" }], "text": "Version: " },
        { "type": "text", "text": "v1" }
      ]},
      { "type": "paragraph", "content": [
        { "type": "text", "marks": [{ "type": "bold" }], "text": "Between: " },
        { "type": "text", "text": "Thryve Growth Co. LLC (\"Thryve\") and the individual or organization booking a service (\"Client\")." }
      ]},
      { "type": "paragraph", "content": [
        { "type": "text", "text": "By typing your full legal name and checking the \"I agree to the Service Agreement\" box during onboarding, Client agrees to the following terms." }
      ]},
      { "type": "horizontalRule" },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "1. Services" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Thryve provides career coaching, leadership coaching, interview preparation, resume and cover letter support, job alerts and watchlist services, HR consulting, and culture and engagement consulting. The specific service Client has purchased is reflected in the receipt and booking confirmation." }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Sessions are delivered via Google Meet unless otherwise agreed. Resume and written deliverables are delivered through Client's Thryve dashboard." }] },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "2. Fees and Payment" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Fees are listed at thryvegrowth.co/book and charged at the time of booking via Stripe. All payments are in U.S. dollars. Subscription services (e.g., Job Alerts) renew automatically each month until canceled." }] },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "3. Cancellation, Rescheduling, and Refunds" }] },
      { "type": "bulletList", "content": [
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "More than 24 hours before the scheduled session: " },
          { "type": "text", "text": "Client may reschedule or cancel at no charge by replying to the booking confirmation email." }
        ]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "Within 24 hours of the scheduled session: " },
          { "type": "text", "text": "Session is non-refundable. One reschedule may be granted at Thryve's discretion." }
        ]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "No-shows: " },
          { "type": "text", "text": "Session is forfeit. No refund." }
        ]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "Multi-session packages: " },
          { "type": "text", "text": "All sessions must be scheduled and completed within 90 days of purchase." }
        ]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "Resume rewrites and HR project work: " },
          { "type": "text", "text": "Refunds are not available once work has begun. Two revision rounds are included; additional rounds may be billed separately." }
        ]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "Job Alerts subscription: " },
          { "type": "text", "text": "Client may cancel at any time. Access continues through the current billing period; no partial-period refunds." }
        ]}]}
      ]},

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "4. Client Responsibilities" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Client agrees to:" }] },
      { "type": "bulletList", "content": [
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Complete the intake form before each session (where applicable);" }]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Provide accurate information;" }]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Attend scheduled sessions on time;" }]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Treat communications respectfully." }]}]}
      ]},

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "5. Confidentiality" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Thryve will not share Client's personal information, session content, uploaded documents, or intake responses outside of what is necessary to deliver the service. Client may share session content as they choose; Thryve will not attribute quotes or testimonials without permission." }] },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "6. Intellectual Property" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Templates, frameworks, and other prepared materials remain Thryve's property. Deliverables created specifically for Client (e.g., a rewritten resume) become Client's property upon final payment." }] },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "7. Scope and Outcomes" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Coaching and consulting outcomes depend on factors beyond Thryve's control, including the job market and Client's own actions. Thryve does not guarantee specific outcomes, including job placement, salary increases, or interview success." }] },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "8. Communication" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Outside of scheduled sessions, communication happens via the Thryve dashboard messaging tool or email. Thryve typically responds within one to two business days." }] },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "9. Termination" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Either party may terminate this engagement at any time. Unused, prepaid sessions are refundable on a prorated basis at Thryve's discretion." }] },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "10. Limitation of Liability" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Thryve's total liability under this agreement is limited to the amount Client paid for the specific service in question." }] },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "11. Governing Law" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "This agreement is governed by the laws of {{ STATE WHERE RACHEL'S BUSINESS IS REGISTERED }}. Any disputes will be resolved in the courts of that jurisdiction." }] },

      { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "12. Updates" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Thryve may update this agreement. Bookings are governed by the version of the agreement in effect at the time of purchase, recorded on the booking record." }] },

      { "type": "horizontalRule" },

      { "type": "paragraph", "content": [
        { "type": "text", "marks": [{ "type": "bold" }], "text": "Questions? " },
        { "type": "text", "text": "Email hello@thryvegrowth.co before signing." }
      ]}
    ]
  }
  $$::jsonb,
  TRUE,
  NOW()
);
