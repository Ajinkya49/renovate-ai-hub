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
      contractor_leads: {
        Row: {
          contractor_id: string
          created_at: string
          estimate_id: string | null
          homeowner_id: string
          id: string
          price_cents: number | null
          project_id: string
          score: number | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          estimate_id?: string | null
          homeowner_id: string
          id?: string
          price_cents?: number | null
          project_id: string
          score?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          estimate_id?: string | null
          homeowner_id?: string
          id?: string
          price_cents?: number | null
          project_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "contractor" | "homeowner"
      lead_status:
        | "new"
        | "viewed"
        | "contacted"
        | "quoted"
        | "won"
        | "lost"
        | "expired"
      notification_channel: "in_app" | "email" | "sms"
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
    },
  },
} as const
