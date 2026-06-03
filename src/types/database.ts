// Auto-generated types will replace this file after running:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// This skeleton matches the schema in supabase/migrations/0001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          phone: string | null;
          role: "client" | "admin";
          avatar_url: string | null;
          company: string | null;
          job_title: string | null;
          ghl_contact_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          phone?: string | null;
          role?: "client" | "admin";
          avatar_url?: string | null;
          company?: string | null;
          job_title?: string | null;
          ghl_contact_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string;
          phone?: string | null;
          role?: "client" | "admin";
          avatar_url?: string | null;
          company?: string | null;
          job_title?: string | null;
          ghl_contact_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      availability_slots: {
        Row: {
          id: string;
          slot_date: string;
          start_time: string;
          end_time: string;
          service_type: string | null;
          is_booked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slot_date: string;
          start_time: string;
          end_time: string;
          service_type?: string | null;
          is_booked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slot_date?: string;
          start_time?: string;
          end_time?: string;
          service_type?: string | null;
          is_booked?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          client_id: string | null;
          slot_id: string | null;
          service_type: string;
          service_key: string | null;
          status: "pending" | "confirmed" | "completed" | "cancelled";
          workflow_status:
            | "booked"
            | "intake_needed"
            | "intake_complete"
            | "session_scheduled"
            | "completed"
            | "follow_up_sent"
            | "cancelled";
          client_notes: string | null;
          admin_notes: string | null;
          stripe_payment_intent_id: string | null;
          stripe_session_id: string | null;
          amount_cents: number | null;
          contract_accepted_at: string | null;
          contract_version: string | null;
          meet_link: string | null;
          calendar_event_id: string | null;
          meet_link_pending: boolean;
          session_at: string | null;
          intake_due_at: string | null;
          completed_at: string | null;
          session_reminder_sent_at: string | null;
          prep_summary_sent_at: string | null;
          follow_up_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          slot_id?: string | null;
          service_type: string;
          service_key?: string | null;
          status?: "pending" | "confirmed" | "completed" | "cancelled";
          workflow_status?:
            | "booked"
            | "intake_needed"
            | "intake_complete"
            | "session_scheduled"
            | "completed"
            | "follow_up_sent"
            | "cancelled";
          client_notes?: string | null;
          admin_notes?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          amount_cents?: number | null;
          contract_accepted_at?: string | null;
          contract_version?: string | null;
          meet_link?: string | null;
          calendar_event_id?: string | null;
          meet_link_pending?: boolean;
          session_at?: string | null;
          intake_due_at?: string | null;
          completed_at?: string | null;
          session_reminder_sent_at?: string | null;
          prep_summary_sent_at?: string | null;
          follow_up_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          slot_id?: string | null;
          service_type?: string;
          service_key?: string | null;
          status?: "pending" | "confirmed" | "completed" | "cancelled";
          workflow_status?:
            | "booked"
            | "intake_needed"
            | "intake_complete"
            | "session_scheduled"
            | "completed"
            | "follow_up_sent"
            | "cancelled";
          client_notes?: string | null;
          admin_notes?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          amount_cents?: number | null;
          contract_accepted_at?: string | null;
          contract_version?: string | null;
          meet_link?: string | null;
          calendar_event_id?: string | null;
          meet_link_pending?: boolean;
          session_at?: string | null;
          intake_due_at?: string | null;
          completed_at?: string | null;
          session_reminder_sent_at?: string | null;
          prep_summary_sent_at?: string | null;
          follow_up_sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          client_id: string | null;
          booking_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_subscription_id: string | null;
          amount_cents: number;
          currency: string;
          status: string;
          service_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          booking_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_subscription_id?: string | null;
          amount_cents: number;
          currency?: string;
          status: string;
          service_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          booking_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_subscription_id?: string | null;
          amount_cents?: number;
          currency?: string;
          status?: string;
          service_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          client_id: string | null;
          uploaded_by: string | null;
          filename: string;
          storage_path: string;
          file_size_bytes: number | null;
          category: "resume" | "cover_letter" | "notes" | "worksheet" | "template" | "other" | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          uploaded_by?: string | null;
          filename: string;
          storage_path: string;
          file_size_bytes?: number | null;
          category?: "resume" | "cover_letter" | "notes" | "worksheet" | "template" | "other" | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          uploaded_by?: string | null;
          filename?: string;
          storage_path?: string;
          file_size_bytes?: number | null;
          category?: "resume" | "cover_letter" | "notes" | "worksheet" | "template" | "other" | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      watchlist_profiles: {
        Row: {
          id: string;
          client_id: string | null;
          target_roles: string[] | null;
          industries: string[] | null;
          locations: string[] | null;
          salary_min: number | null;
          salary_max: number | null;
          remote_preference: "remote" | "hybrid" | "onsite" | "any" | null;
          experience_level: string | null;
          preferences_notes: string | null;
          subscription_status: string;
          stripe_subscription_id: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          target_roles?: string[] | null;
          industries?: string[] | null;
          locations?: string[] | null;
          salary_min?: number | null;
          salary_max?: number | null;
          remote_preference?: "remote" | "hybrid" | "onsite" | "any" | null;
          experience_level?: string | null;
          preferences_notes?: string | null;
          subscription_status?: string;
          stripe_subscription_id?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          target_roles?: string[] | null;
          industries?: string[] | null;
          locations?: string[] | null;
          salary_min?: number | null;
          salary_max?: number | null;
          remote_preference?: "remote" | "hybrid" | "onsite" | "any" | null;
          experience_level?: string | null;
          preferences_notes?: string | null;
          subscription_status?: string;
          stripe_subscription_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_listings: {
        Row: {
          id: string;
          title: string;
          company: string;
          location: string | null;
          is_remote: boolean;
          url: string | null;
          description: string | null;
          salary_range: string | null;
          source: string | null;
          external_id: string | null;
          date_posted: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          company: string;
          location?: string | null;
          is_remote?: boolean;
          url?: string | null;
          description?: string | null;
          salary_range?: string | null;
          source?: string | null;
          external_id?: string | null;
          date_posted?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          company?: string;
          location?: string | null;
          is_remote?: boolean;
          url?: string | null;
          description?: string | null;
          salary_range?: string | null;
          source?: string | null;
          external_id?: string | null;
          date_posted?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      client_job_matches: {
        Row: {
          id: string;
          client_id: string | null;
          job_id: string | null;
          status: "new" | "saved" | "interested" | "applied" | "not_a_fit" | "archived" | "interviewing" | "offer";
          rachel_recommended: boolean;
          client_notes: string | null;
          application_date: string | null;
          interview_date: string | null;
          score: number | null;
          score_label: "strong" | "good" | "maybe" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          job_id?: string | null;
          status?: "new" | "saved" | "interested" | "applied" | "not_a_fit" | "archived" | "interviewing" | "offer";
          rachel_recommended?: boolean;
          client_notes?: string | null;
          application_date?: string | null;
          interview_date?: string | null;
          score?: number | null;
          score_label?: "strong" | "good" | "maybe" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          job_id?: string | null;
          status?: "new" | "saved" | "interested" | "applied" | "not_a_fit" | "archived" | "interviewing" | "offer";
          rachel_recommended?: boolean;
          client_notes?: string | null;
          application_date?: string | null;
          interview_date?: string | null;
          score?: number | null;
          score_label?: "strong" | "good" | "maybe" | null;
          created_at?: string;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          content: Json | null;
          featured_image_path: string | null;
          published: boolean;
          published_at: string | null;
          author_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          content?: Json | null;
          featured_image_path?: string | null;
          published?: boolean;
          published_at?: string | null;
          author_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          excerpt?: string | null;
          content?: Json | null;
          featured_image_path?: string | null;
          published?: boolean;
          published_at?: string | null;
          author_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          source: string | null;
          ghl_contact_id: string | null;
          subscribed_at: string;
          unsubscribed_at: string | null;
          interests: string[];
          last_engaged_at: string | null;
          last_sent_at: string | null;
          welcome_sent_at: string | null;
          unsubscribe_token: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name?: string | null;
          source?: string | null;
          ghl_contact_id?: string | null;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
          interests?: string[];
          last_engaged_at?: string | null;
          last_sent_at?: string | null;
          welcome_sent_at?: string | null;
          unsubscribe_token?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          source?: string | null;
          ghl_contact_id?: string | null;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
          interests?: string[];
          last_engaged_at?: string | null;
          last_sent_at?: string | null;
          welcome_sent_at?: string | null;
          unsubscribe_token?: string;
        };
        Relationships: [];
      };
      newsletter_issues: {
        Row: {
          id: string;
          title: string;
          subject: string;
          preheader: string;
          content: Json;
          status: "draft" | "pending_approval" | "scheduled" | "sending" | "sent" | "failed";
          scheduled_for: string | null;
          sent_at: string | null;
          sent_count: number;
          failed_count: number;
          template_id: string | null;
          target_interests: string[];
          featured_blog_post_id: string | null;
          author_id: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subject?: string;
          preheader?: string;
          content: Json;
          status?: "draft" | "pending_approval" | "scheduled" | "sending" | "sent" | "failed";
          scheduled_for?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          failed_count?: number;
          template_id?: string | null;
          target_interests?: string[];
          featured_blog_post_id?: string | null;
          author_id?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subject?: string;
          preheader?: string;
          content?: Json;
          status?: "draft" | "pending_approval" | "scheduled" | "sending" | "sent" | "failed";
          scheduled_for?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          failed_count?: number;
          template_id?: string | null;
          target_interests?: string[];
          featured_blog_post_id?: string | null;
          author_id?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      newsletter_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          content: Json;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          content: Json;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          content?: Json;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      newsletter_sends: {
        Row: {
          id: string;
          issue_id: string;
          subscriber_id: string;
          resend_message_id: string | null;
          status: "sent" | "failed" | "bounced";
          error: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          subscriber_id: string;
          resend_message_id?: string | null;
          status?: "sent" | "failed" | "bounced";
          error?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          subscriber_id?: string;
          resend_message_id?: string | null;
          status?: "sent" | "failed" | "bounced";
          error?: string | null;
          sent_at?: string;
        };
        Relationships: [];
      };
      newsletter_events: {
        Row: {
          id: string;
          send_id: string | null;
          subscriber_id: string | null;
          issue_id: string | null;
          event_type: "delivered" | "opened" | "clicked" | "bounced" | "complained" | "unsubscribed";
          url: string | null;
          user_agent: string | null;
          occurred_at: string;
          resend_event_id: string | null;
        };
        Insert: {
          id?: string;
          send_id?: string | null;
          subscriber_id?: string | null;
          issue_id?: string | null;
          event_type: "delivered" | "opened" | "clicked" | "bounced" | "complained" | "unsubscribed";
          url?: string | null;
          user_agent?: string | null;
          occurred_at?: string;
          resend_event_id?: string | null;
        };
        Update: {
          id?: string;
          send_id?: string | null;
          subscriber_id?: string | null;
          issue_id?: string | null;
          event_type?: "delivered" | "opened" | "clicked" | "bounced" | "complained" | "unsubscribed";
          url?: string | null;
          user_agent?: string | null;
          occurred_at?: string;
          resend_event_id?: string | null;
        };
        Relationships: [];
      };
      newsletter_ideas: {
        Row: {
          id: string;
          body: string;
          used_in_issue_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          body: string;
          used_in_issue_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          body?: string;
          used_in_issue_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_client_notes: {
        Row: {
          id: string;
          client_id: string | null;
          note: string;
          session_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          note: string;
          session_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          note?: string;
          session_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      client_profiles: {
        Row: {
          id: string;
          client_id: string;
          location: string | null;
          timezone: string | null;
          pronouns: string | null;
          current_position: string | null;
          company: string | null;
          industry: string | null;
          years_experience: string | null;
          primary_goal: string | null;
          services_interested: string[] | null;
          preferred_contact_method: "email" | "phone" | "text" | null;
          availability_notes: string | null;
          resume_document_id: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          location?: string | null;
          timezone?: string | null;
          pronouns?: string | null;
          current_position?: string | null;
          company?: string | null;
          industry?: string | null;
          years_experience?: string | null;
          primary_goal?: string | null;
          services_interested?: string[] | null;
          preferred_contact_method?: "email" | "phone" | "text" | null;
          availability_notes?: string | null;
          resume_document_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          location?: string | null;
          timezone?: string | null;
          pronouns?: string | null;
          current_position?: string | null;
          company?: string | null;
          industry?: string | null;
          years_experience?: string | null;
          primary_goal?: string | null;
          services_interested?: string[] | null;
          preferred_contact_method?: "email" | "phone" | "text" | null;
          availability_notes?: string | null;
          resume_document_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          current_position: string | null;
          target_role: string | null;
          location: string | null;
          remote_preference: "remote" | "hybrid" | "onsite" | "any" | null;
          timeline: string | null;
          notes: string | null;
          source: string;
          status: "new" | "contacted" | "qualified" | "converted" | "lost";
          admin_notes: string | null;
          converted_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          phone?: string | null;
          current_position?: string | null;
          target_role?: string | null;
          location?: string | null;
          remote_preference?: "remote" | "hybrid" | "onsite" | "any" | null;
          timeline?: string | null;
          notes?: string | null;
          source?: string;
          status?: "new" | "contacted" | "qualified" | "converted" | "lost";
          admin_notes?: string | null;
          converted_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          current_position?: string | null;
          target_role?: string | null;
          location?: string | null;
          remote_preference?: "remote" | "hybrid" | "onsite" | "any" | null;
          timeline?: string | null;
          notes?: string | null;
          source?: string;
          status?: "new" | "contacted" | "qualified" | "converted" | "lost";
          admin_notes?: string | null;
          converted_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      intake_responses: {
        Row: {
          id: string;
          booking_id: string;
          client_id: string;
          service_key: string;
          schema_version: string;
          responses: Json;
          submitted_at: string | null;
          last_saved_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          client_id: string;
          service_key: string;
          schema_version?: string;
          responses?: Json;
          submitted_at?: string | null;
          last_saved_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          client_id?: string;
          service_key?: string;
          schema_version?: string;
          responses?: Json;
          submitted_at?: string | null;
          last_saved_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      client_messages: {
        Row: {
          id: string;
          client_id: string;
          sender_id: string;
          sender_role: "client" | "admin";
          booking_id: string | null;
          body: string;
          attachment_path: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          sender_id: string;
          sender_role: "client" | "admin";
          booking_id?: string | null;
          body: string;
          attachment_path?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          sender_id?: string;
          sender_role?: "client" | "admin";
          booking_id?: string | null;
          body?: string;
          attachment_path?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      email_templates: {
        Row: {
          id: string;
          key: string;
          subject: string;
          body_html: string;
          placeholders: string[];
          description: string | null;
          updated_at: string;
          updated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          subject: string;
          body_html: string;
          placeholders?: string[];
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          subject?: string;
          body_html?: string;
          placeholders?: string[];
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      automation_log: {
        Row: {
          id: string;
          event_key: string;
          booking_id: string | null;
          client_id: string | null;
          payload: Json;
          status: "success" | "failed" | "skipped";
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_key: string;
          booking_id?: string | null;
          client_id?: string | null;
          payload?: Json;
          status?: "success" | "failed" | "skipped";
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_key?: string;
          booking_id?: string | null;
          client_id?: string | null;
          payload?: Json;
          status?: "success" | "failed" | "skipped";
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_integrations: {
        Row: {
          id: string;
          provider: string;
          account_email: string | null;
          access_token_encrypted: string;
          refresh_token_encrypted: string;
          access_token_expires_at: string | null;
          scope: string | null;
          connected_at: string;
          connected_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          account_email?: string | null;
          access_token_encrypted: string;
          refresh_token_encrypted: string;
          access_token_expires_at?: string | null;
          scope?: string | null;
          connected_at?: string;
          connected_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          account_email?: string | null;
          access_token_encrypted?: string;
          refresh_token_encrypted?: string;
          access_token_expires_at?: string | null;
          scope?: string | null;
          connected_at?: string;
          connected_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_agreements: {
        Row: {
          id: string;
          version_label: string;
          title: string;
          content: Json;
          is_current: boolean;
          published_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          version_label: string;
          title: string;
          content: Json;
          is_current?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          version_label?: string;
          title?: string;
          content?: Json;
          is_current?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      signed_service_agreements: {
        Row: {
          id: string;
          client_id: string;
          agreement_id: string;
          version_label: string;
          content_snapshot: Json;
          signed_full_name: string;
          signed_at: string;
          ip_address: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          agreement_id: string;
          version_label: string;
          content_snapshot: Json;
          signed_full_name: string;
          signed_at?: string;
          ip_address?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          agreement_id?: string;
          version_label?: string;
          content_snapshot?: Json;
          signed_full_name?: string;
          signed_at?: string;
          ip_address?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// Convenience row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type WatchlistProfile = Database["public"]["Tables"]["watchlist_profiles"]["Row"];
export type JobListing = Database["public"]["Tables"]["job_listings"]["Row"];
export type ClientJobMatch = Database["public"]["Tables"]["client_job_matches"]["Row"];
export type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type ClientProfile = Database["public"]["Tables"]["client_profiles"]["Row"];
export type NewsletterSubscriber = Database["public"]["Tables"]["newsletter_subscribers"]["Row"];
export type NewsletterIssue = Database["public"]["Tables"]["newsletter_issues"]["Row"];
export type NewsletterTemplate = Database["public"]["Tables"]["newsletter_templates"]["Row"];
export type NewsletterSend = Database["public"]["Tables"]["newsletter_sends"]["Row"];
export type NewsletterEvent = Database["public"]["Tables"]["newsletter_events"]["Row"];
export type NewsletterIdea = Database["public"]["Tables"]["newsletter_ideas"]["Row"];
export type IntakeResponse = Database["public"]["Tables"]["intake_responses"]["Row"];
export type ClientMessage = Database["public"]["Tables"]["client_messages"]["Row"];
export type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];
export type AutomationLogEntry = Database["public"]["Tables"]["automation_log"]["Row"];
export type AdminIntegration = Database["public"]["Tables"]["admin_integrations"]["Row"];
export type ServiceAgreement = Database["public"]["Tables"]["service_agreements"]["Row"];
export type SignedServiceAgreement = Database["public"]["Tables"]["signed_service_agreements"]["Row"];

export type WorkflowStatus = Booking["workflow_status"];
export type EmailTemplateKey =
  | "receipt"
  | "welcome"
  | "intake_reminder_48h"
  | "intake_reminder_24h"
  | "intake_complete"
  | "session_reminder_24h"
  | "post_service_followup"
  | "deliverable_ready";
