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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      broadcast_logs: {
        Row: {
          completed_at: string | null
          content: string | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          exclude_admins: boolean
          group_names: string[] | null
          groups_targeted: number
          id: string
          instance_id: string
          instance_name: string | null
          media_url: string | null
          message_type: string
          random_delay: string | null
          recipients_failed: number
          recipients_success: number
          recipients_targeted: number
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          exclude_admins?: boolean
          group_names?: string[] | null
          groups_targeted?: number
          id?: string
          instance_id: string
          instance_name?: string | null
          media_url?: string | null
          message_type?: string
          random_delay?: string | null
          recipients_failed?: number
          recipients_success?: number
          recipients_targeted?: number
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          exclude_admins?: boolean
          group_names?: string[] | null
          groups_targeted?: number
          id?: string
          instance_id?: string
          instance_name?: string | null
          media_url?: string | null
          message_type?: string
          random_delay?: string | null
          recipients_failed?: number
          recipients_success?: number
          recipients_targeted?: number
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      instances: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_jid: string | null
          profile_pic_url: string | null
          status: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          owner_jid?: string | null
          profile_pic_url?: string | null
          status?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_jid?: string | null
          profile_pic_url?: string | null
          status?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          carousel_data: Json | null
          category: string | null
          content: string | null
          created_at: string
          filename: string | null
          id: string
          media_url: string | null
          message_type: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          carousel_data?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          carousel_data?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_message_logs: {
        Row: {
          error_message: string | null
          executed_at: string
          id: string
          recipients_failed: number | null
          recipients_success: number | null
          recipients_total: number | null
          response_data: Json | null
          scheduled_message_id: string
          status: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string
          id?: string
          recipients_failed?: number | null
          recipients_success?: number | null
          recipients_total?: number | null
          response_data?: Json | null
          scheduled_message_id: string
          status: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string
          id?: string
          recipients_failed?: number | null
          recipients_success?: number | null
          recipients_total?: number | null
          response_data?: Json | null
          scheduled_message_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_message_logs_scheduled_message_id_fkey"
            columns: ["scheduled_message_id"]
            isOneToOne: false
            referencedRelation: "scheduled_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          content: string | null
          created_at: string
          exclude_admins: boolean | null
          executions_count: number | null
          filename: string | null
          group_jid: string
          group_name: string | null
          id: string
          instance_id: string
          is_recurring: boolean | null
          last_error: string | null
          last_executed_at: string | null
          media_url: string | null
          message_type: string
          next_run_at: string
          random_delay: string | null
          recipients: Json | null
          recurrence_count: number | null
          recurrence_days: number[] | null
          recurrence_end_at: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          exclude_admins?: boolean | null
          executions_count?: number | null
          filename?: string | null
          group_jid: string
          group_name?: string | null
          id?: string
          instance_id: string
          is_recurring?: boolean | null
          last_error?: string | null
          last_executed_at?: string | null
          media_url?: string | null
          message_type: string
          next_run_at: string
          random_delay?: string | null
          recipients?: Json | null
          recurrence_count?: number | null
          recurrence_days?: number[] | null
          recurrence_end_at?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          exclude_admins?: boolean | null
          executions_count?: number | null
          filename?: string | null
          group_jid?: string
          group_name?: string | null
          id?: string
          instance_id?: string
          is_recurring?: boolean | null
          last_error?: string | null
          last_executed_at?: string | null
          media_url?: string | null
          message_type?: string
          next_run_at?: string
          random_delay?: string | null
          recipients?: Json | null
          recurrence_count?: number | null
          recurrence_days?: number[] | null
          recurrence_end_at?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      user_instance_access: {
        Row: {
          created_at: string
          id: string
          instance_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "user"
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
      app_role: ["super_admin", "user"],
    },
  },
} as const
