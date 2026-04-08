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
          status: "pending" | "confirmed" | "completed" | "cancelled";
          client_notes: string | null;
          admin_notes: string | null;
          stripe_payment_intent_id: string | null;
          amount_cents: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          slot_id?: string | null;
          service_type: string;
          status?: "pending" | "confirmed" | "completed" | "cancelled";
          client_notes?: string | null;
          admin_notes?: string | null;
          stripe_payment_intent_id?: string | null;
          amount_cents?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          slot_id?: string | null;
          service_type?: string;
          status?: "pending" | "confirmed" | "completed" | "cancelled";
          client_notes?: string | null;
          admin_notes?: string | null;
          stripe_payment_intent_id?: string | null;
          amount_cents?: number | null;
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
        };
        Insert: {
          id?: string;
          email: string;
          first_name?: string | null;
          source?: string | null;
          ghl_contact_id?: string | null;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          source?: string | null;
          ghl_contact_id?: string | null;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
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
