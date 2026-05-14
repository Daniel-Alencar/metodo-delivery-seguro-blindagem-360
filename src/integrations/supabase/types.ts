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
      documents: {
        Row: {
          body: string | null
          created_at: string
          description: string | null
          id: string
          module_id: string | null
          title: string
          updated_at: string
          version: string
          week_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          title: string
          updated_at?: string
          version?: string
          week_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          title?: string
          updated_at?: string
          version?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          archive_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          next_step_chosen_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          archive_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          next_step_chosen_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          archive_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          next_step_chosen_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["incident_category"]
          created_at: string
          description: string
          id: string
          resolution: string | null
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          description: string
          id?: string
          resolution?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          description?: string
          id?: string
          resolution?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["mentor_action"]
          created_at: string
          enrollment_id: string | null
          id: string
          mentor_id: string
          metadata: Json | null
          notes: string | null
          student_id: string | null
          week_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["mentor_action"]
          created_at?: string
          enrollment_id?: string | null
          id?: string
          mentor_id: string
          metadata?: Json | null
          notes?: string | null
          student_id?: string | null
          week_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["mentor_action"]
          created_at?: string
          enrollment_id?: string | null
          id?: string
          mentor_id?: string
          metadata?: Json | null
          notes?: string | null
          student_id?: string | null
          week_id?: string | null
        }
        Relationships: []
      }
      modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          month_index: number
          title: string
          vertical: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          month_index: number
          title: string
          vertical?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          month_index?: number
          title?: string
          vertical?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          amount_cents: number
          billing_interval: string
          code: string
          created_at: string
          currency: string
          description: string | null
          discount_percent: number
          id: string
          name: string
          stripe_price_id: string | null
          updated_at: string
          vertical: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          billing_interval: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          discount_percent?: number
          id?: string
          name: string
          stripe_price_id?: string | null
          updated_at?: string
          vertical?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          discount_percent?: number
          id?: string
          name?: string
          stripe_price_id?: string | null
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      strategic_messages: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_month: number
          followup_paid_until: string | null
          id: string
          paid_until: string | null
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_month?: number
          followup_paid_until?: string | null
          id?: string
          paid_until?: string | null
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_month?: number
          followup_paid_until?: string | null
          id?: string
          paid_until?: string | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
      week_progress: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          enrollment_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["week_status"]
          submitted_at: string | null
          updated_at: string
          week_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["week_status"]
          submitted_at?: string | null
          updated_at?: string
          week_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["week_status"]
          submitted_at?: string | null
          updated_at?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "week_progress_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weeks: {
        Row: {
          agenda: string | null
          created_at: string
          description: string | null
          homework: string | null
          id: string
          is_checkpoint: boolean
          module_id: string
          summary: string | null
          title: string
          week_index: number
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          description?: string | null
          homework?: string | null
          id?: string
          is_checkpoint?: boolean
          module_id: string
          summary?: string | null
          title: string
          week_index: number
        }
        Update: {
          agenda?: string | null
          created_at?: string
          description?: string | null
          homework?: string | null
          id?: string
          is_checkpoint?: boolean
          module_id?: string
          summary?: string | null
          title?: string
          week_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "weeks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_audit_list: {
        Args: {
          _action?: Database["public"]["Enums"]["mentor_action"]
          _limit?: number
          _mentor?: string
          _student?: string
        }
        Returns: {
          action: Database["public"]["Enums"]["mentor_action"]
          created_at: string
          id: string
          mentor_email: string
          mentor_id: string
          mentor_name: string
          metadata: Json
          notes: string
          student_email: string
          student_id: string
          student_name: string
          week_index: number
          week_title: string
        }[]
      }
      admin_extend_followup: {
        Args: { _days?: number; _user_id: string }
        Returns: string
      }
      admin_find_user_by_email: {
        Args: { _email: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      admin_grant_mentor: { Args: { _user_id: string }; Returns: undefined }
      admin_list_mentors: {
        Args: never
        Returns: {
          email: string
          full_name: string
          granted_at: string
          is_admin: boolean
          user_id: string
        }[]
      }
      admin_revoke_mentor: { Args: { _user_id: string }; Returns: undefined }
      cancel_archive: { Args: { _enrollment_id: string }; Returns: undefined }
      daily_archive_expired: { Args: never; Returns: number }
      log_class_attendance: {
        Args: { _enrollment_id: string; _notes?: string; _week_id: string }
        Returns: string
      }
      maybe_graduate_enrollment: {
        Args: { _enrollment_id: string }
        Returns: undefined
      }
      request_archive: { Args: { _enrollment_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "mentor" | "cliente"
      enrollment_status:
        | "pending"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
        | "graduated"
        | "archiving"
        | "archived"
      incident_category:
        | "procon"
        | "chargeback"
        | "sanitaria"
        | "trabalhista"
        | "midia_social"
        | "outros"
        | "consultation"
      incident_status: "open" | "in_progress" | "resolved" | "closed"
      mentor_action:
        | "week_released"
        | "week_approved"
        | "class_attended"
        | "followup_extended"
        | "mentor_granted"
        | "mentor_revoked"
        | "archive_requested"
        | "archive_cancelled"
      week_status: "locked" | "in_progress" | "submitted" | "approved"
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
      app_role: ["admin", "mentor", "cliente"],
      enrollment_status: [
        "pending",
        "active",
        "paused",
        "completed",
        "cancelled",
        "graduated",
        "archiving",
        "archived",
      ],
      incident_category: [
        "procon",
        "chargeback",
        "sanitaria",
        "trabalhista",
        "midia_social",
        "outros",
        "consultation",
      ],
      incident_status: ["open", "in_progress", "resolved", "closed"],
      mentor_action: [
        "week_released",
        "week_approved",
        "class_attended",
        "followup_extended",
        "mentor_granted",
        "mentor_revoked",
        "archive_requested",
        "archive_cancelled",
      ],
      week_status: ["locked", "in_progress", "submitted", "approved"],
    },
  },
} as const
