export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_analysis: {
        Row: {
          complexity: string | null
          confidence: number | null
          created_at: string
          detected_objects: Json
          id: string
          latency_ms: number | null
          model: string
          project_id: string
          scope: Json
          tokens_used: number | null
        }
        Insert: {
          complexity?: string | null
          confidence?: number | null
          created_at?: string
          detected_objects?: Json
          id?: string
          latency_ms?: number | null
          model: string
          project_id: string
          scope?: Json
          tokens_used?: number | null
        }
        Update: {
          complexity?: string | null
          confidence?: number | null
          created_at?: string
          detected_objects?: Json
          id?: string
          latency_ms?: number | null
          model?: string
          project_id?: string
          scope?: Json
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: []
      }
      contractor_documents: {
        Row: {
          bytes: number | null
          contractor_id: string
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          expires_at: string | null
          file_name: string | null
          id: string
          mime_type: string | null
          notes: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          bytes?: number | null
          contractor_id: string
          created_at?: string
          doc_type: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_name?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_bucket: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          bytes?: number | null
          contractor_id?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_name?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      contractor_leads: {
        Row: {
          contractor_id: string
          created_at: string
          credit_cost: number
          estimate_id: string | null
          homeowner_id: string
          id: string
          is_unlocked: boolean
          price_cents: number | null
          project_id: string
          score: number | null
          status: Database["public"]["Enums"]["lead_status"]
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          credit_cost?: number
          estimate_id?: string | null
          homeowner_id: string
          id?: string
          is_unlocked?: boolean
          price_cents?: number | null
          project_id: string
          score?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          credit_cost?: number
          estimate_id?: string | null
          homeowner_id?: string
          id?: string
          is_unlocked?: boolean
          price_cents?: number | null
          project_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_leads_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_leads_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_reviews: {
        Row: {
          body: string | null
          contractor_id: string
          created_at: string
          id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          body?: string | null
          contractor_id: string
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
        }
        Update: {
          body?: string | null
          contractor_id?: string
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_reviews_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_verifications: {
        Row: {
          contractor_id: string
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Relationships: []
      }
      contractors: {
        Row: {
          bio: string | null
          business_name: string
          created_at: string
          id: string
          insured: boolean
          is_active: boolean
          license_number: string | null
          logo_url: string | null
          rating: number
          response_minutes_avg: number | null
          review_count: number
          service_regions: string[]
          service_zip_codes: string[]
          slug: string
          specialties: string[]
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          business_name: string
          created_at?: string
          id?: string
          insured?: boolean
          is_active?: boolean
          license_number?: string | null
          logo_url?: string | null
          rating?: number
          response_minutes_avg?: number | null
          review_count?: number
          service_regions?: string[]
          service_zip_codes?: string[]
          slug: string
          specialties?: string[]
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          business_name?: string
          created_at?: string
          id?: string
          insured?: boolean
          is_active?: boolean
          license_number?: string | null
          logo_url?: string | null
          rating?: number
          response_minutes_avg?: number | null
          review_count?: number
          service_regions?: string[]
          service_zip_codes?: string[]
          slug?: string
          specialties?: string[]
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      estimate_line_items: {
        Row: {
          category: string
          description: string
          estimate_id: string
          id: string
          quantity: number
          sort_order: number
          subtotal_cents: number
          unit: string | null
          unit_cost_cents: number
        }
        Insert: {
          category: string
          description: string
          estimate_id: string
          id?: string
          quantity?: number
          sort_order?: number
          subtotal_cents: number
          unit?: string | null
          unit_cost_cents: number
        }
        Update: {
          category?: string
          description?: string
          estimate_id?: string
          id?: string
          quantity?: number
          sort_order?: number
          subtotal_cents?: number
          unit?: string | null
          unit_cost_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          assumptions: Json
          confidence: number | null
          created_at: string
          expected_cents: number
          high_cents: number
          id: string
          low_cents: number
          pricing_version: string
          project_id: string
          region: string | null
          timeline_weeks_max: number | null
          timeline_weeks_min: number | null
        }
        Insert: {
          assumptions?: Json
          confidence?: number | null
          created_at?: string
          expected_cents: number
          high_cents: number
          id?: string
          low_cents: number
          pricing_version?: string
          project_id: string
          region?: string | null
          timeline_weeks_max?: number | null
          timeline_weeks_min?: number | null
        }
        Update: {
          assumptions?: Json
          confidence?: number | null
          created_at?: string
          expected_cents?: number
          high_cents?: number
          id?: string
          low_cents?: number
          pricing_version?: string
          project_id?: string
          region?: string | null
          timeline_weeks_max?: number | null
          timeline_weeks_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          metadata: Json
          rollout_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          metadata?: Json
          rollout_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          metadata?: Json
          rollout_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_credits: {
        Row: {
          balance: number
          contractor_id: string
          created_at: string
          id: string
          lifetime_purchased: number
          lifetime_spent: number
          updated_at: string
        }
        Insert: {
          balance?: number
          contractor_id: string
          created_at?: string
          id?: string
          lifetime_purchased?: number
          lifetime_spent?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          contractor_id?: string
          created_at?: string
          id?: string
          lifetime_purchased?: number
          lifetime_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          lead_id: string
          metadata: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          metadata?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "contractor_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_purchases: {
        Row: {
          amount_cents: number | null
          balance_after: number
          contractor_id: string
          created_at: string
          credits_delta: number
          id: string
          kind: string
          lead_id: string | null
          note: string | null
          package_key: string | null
        }
        Insert: {
          amount_cents?: number | null
          balance_after: number
          contractor_id: string
          created_at?: string
          credits_delta: number
          id?: string
          kind: string
          lead_id?: string | null
          note?: string | null
          package_key?: string | null
        }
        Update: {
          amount_cents?: number | null
          balance_after?: number
          contractor_id?: string
          created_at?: string
          credits_delta?: number
          id?: string
          kind?: string
          lead_id?: string | null
          note?: string | null
          package_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "contractor_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          contractor_id: string | null
          created_at: string
          currency: string
          id: string
          lead_id: string | null
          metadata: Json
          provider: string | null
          provider_payment_id: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          contractor_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          provider?: string | null
          provider_payment_id?: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          contractor_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          provider?: string | null
          provider_payment_id?: string | null
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          region: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          region?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          region?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          owner_id: string
          region: string | null
          room_type: Database["public"]["Enums"]["room_type"]
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          region?: string | null
          room_type?: Database["public"]["Enums"]["room_type"]
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          region?: string | null
          room_type?: Database["public"]["Enums"]["room_type"]
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      room_uploads: {
        Row: {
          bytes: number | null
          created_at: string
          height: number | null
          id: string
          mime_type: string | null
          owner_id: string
          project_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          owner_id: string
          project_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          owner_id?: string
          project_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          contractor_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          plan: Database["public"]["Enums"]["subscription_plan"]
          provider: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          contractor_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan?: Database["public"]["Enums"]["subscription_plan"]
          provider?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          contractor_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan?: Database["public"]["Enums"]["subscription_plan"]
          provider?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_lead_credits: {
        Args: {
          _amount_cents: number
          _contractor_id: string
          _credits: number
          _kind?: string
          _package_key: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      unlock_lead_with_credits: {
        Args: { _lead_id: string; _user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "contractor" | "homeowner"
      document_status: "pending" | "approved" | "rejected" | "expired"
      document_type: "license" | "insurance" | "w9" | "id" | "gallery" | "other"
      lead_status:
        | "new"
        | "viewed"
        | "contacted"
        | "quoted"
        | "won"
        | "lost"
        | "expired"
      notification_channel: "in_app" | "email" | "sms"
      payment_purpose:
        | "lead_purchase"
        | "subscription"
        | "credit_topup"
        | "refund"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      project_status:
        | "draft"
        | "analyzing"
        | "estimated"
        | "matched"
        | "closed"
        | "archived"
      room_type:
        | "kitchen"
        | "bathroom"
        | "living_room"
        | "bedroom"
        | "basement"
        | "whole_home"
        | "exterior"
        | "other"
      subscription_plan: "free" | "starter" | "pro" | "enterprise"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
      verification_status: "pending" | "approved" | "rejected" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "contractor", "homeowner"],
      document_status: ["pending", "approved", "rejected", "expired"],
      document_type: ["license", "insurance", "w9", "id", "gallery", "other"],
      lead_status: [
        "new",
        "viewed",
        "contacted",
        "quoted",
        "won",
        "lost",
        "expired",
      ],
      notification_channel: ["in_app", "email", "sms"],
      payment_purpose: [
        "lead_purchase",
        "subscription",
        "credit_topup",
        "refund",
      ],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      project_status: [
        "draft",
        "analyzing",
        "estimated",
        "matched",
        "closed",
        "archived",
      ],
      room_type: [
        "kitchen",
        "bathroom",
        "living_room",
        "bedroom",
        "basement",
        "whole_home",
        "exterior",
        "other",
      ],
      subscription_plan: ["free", "starter", "pro", "enterprise"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
      ],
      verification_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
