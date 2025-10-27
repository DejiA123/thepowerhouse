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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      bible_highlights: {
        Row: {
          book: string
          chapter: number
          created_at: string | null
          highlight_color: string | null
          id: string
          updated_at: string | null
          user_id: string
          verse: number | null
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string | null
          highlight_color?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          verse?: number | null
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string | null
          highlight_color?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          verse?: number | null
        }
        Relationships: []
      }
      bible_notes: {
        Row: {
          book: string
          category: string | null
          chapter: number
          color: string | null
          created_at: string | null
          id: string
          is_favorite: boolean | null
          is_pinned: boolean | null
          is_private: boolean | null
          mood: string | null
          note_text: string
          priority: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string
          verse: number | null
        }
        Insert: {
          book: string
          category?: string | null
          chapter: number
          color?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          is_private?: boolean | null
          mood?: string | null
          note_text: string
          priority?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          verse?: number | null
        }
        Update: {
          book?: string
          category?: string | null
          chapter?: number
          color?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          is_private?: boolean | null
          mood?: string | null
          note_text?: string
          priority?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          verse?: number | null
        }
        Relationships: []
      }
      chat_notifications: {
        Row: {
          created_at: string
          group_name: string
          id: string
          is_read: boolean | null
          message_id: string
          message_preview: string
          sender_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_name: string
          id?: string
          is_read?: boolean | null
          message_id: string
          message_preview: string
          sender_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_name?: string
          id?: string
          is_read?: boolean | null
          message_id?: string
          message_preview?: string
          sender_name?: string
          user_id?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          donation_type: string
          id: string
          payment_intent_id: string | null
          payment_method: string
          status: string | null
          testimony: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          donation_type: string
          id?: string
          payment_intent_id?: string | null
          payment_method: string
          status?: string | null
          testimony?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          donation_type?: string
          id?: string
          payment_intent_id?: string | null
          payment_method?: string
          status?: string | null
          testimony?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          location: string | null
          priority: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          location?: string | null
          priority?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          location?: string | null
          priority?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_name: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_name: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_name?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      group_messages: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          group_name: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          group_name: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          group_name?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_messages_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_services: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_live: boolean | null
          scheduled_time: string | null
          service_type: string
          title: string
          updated_at: string
          youtube_video_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_live?: boolean | null
          scheduled_time?: string | null
          service_type: string
          title: string
          updated_at?: string
          youtube_video_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_live?: boolean | null
          scheduled_time?: string | null
          service_type?: string
          title?: string
          updated_at?: string
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          group_chat_notifications: boolean | null
          id: string
          sound_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_chat_notifications?: boolean | null
          id?: string
          sound_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_chat_notifications?: boolean | null
          id?: string
          sound_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_private: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          admin_id: string
          id: string
          ip_address: unknown
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          access_type?: string
          accessed_at?: string | null
          admin_id: string
          id?: string
          ip_address?: unknown
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          admin_id?: string
          id?: string
          ip_address?: unknown
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          links: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          links?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          links?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reading_plan_progress: {
        Row: {
          completed_days: string[] | null
          current_day: number | null
          enrolled_at: string | null
          id: string
          plan_id: string
          user_id: string
        }
        Insert: {
          completed_days?: string[] | null
          current_day?: number | null
          enrolled_at?: string | null
          id?: string
          plan_id: string
          user_id: string
        }
        Update: {
          completed_days?: string[] | null
          current_day?: number | null
          enrolled_at?: string | null
          id?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: []
      }
      resource_downloads: {
        Row: {
          downloaded_at: string | null
          id: string
          ip_address: unknown
          resource_category: string
          resource_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          downloaded_at?: string | null
          id?: string
          ip_address?: unknown
          resource_category: string
          resource_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          downloaded_at?: string | null
          id?: string
          ip_address?: unknown
          resource_category?: string
          resource_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sermon_series: {
        Row: {
          audio_url: string | null
          created_at: string | null
          description: string | null
          download_url: string | null
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: []
      }
      service_attendance: {
        Row: {
          created_at: string
          id: string
          service_date: string
          service_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_date: string
          service_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_date?: string
          service_time?: string
          user_id?: string
        }
        Relationships: []
      }
      study_guides: {
        Row: {
          created_at: string | null
          description: string | null
          file_url: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_url: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_url?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          audio_quality: string | null
          created_at: string | null
          id: string
          notifications_enabled: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_quality?: string | null
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_quality?: string | null
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["church_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["church_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["church_role"]
          user_id?: string
        }
        Relationships: []
      }
      youtube_api_usage: {
        Row: {
          api_calls_made: number | null
          cached_response: boolean | null
          created_at: string | null
          error_message: string | null
          function_name: string
          id: number
          quota_units_used: number | null
          success: boolean | null
        }
        Insert: {
          api_calls_made?: number | null
          cached_response?: boolean | null
          created_at?: string | null
          error_message?: string | null
          function_name: string
          id?: number
          quota_units_used?: number | null
          success?: boolean | null
        }
        Update: {
          api_calls_made?: number | null
          cached_response?: boolean | null
          created_at?: string | null
          error_message?: string | null
          function_name?: string
          id?: number
          quota_units_used?: number | null
          success?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_sensitive_profile_data: {
        Args: { _profile_user_id: string }
        Returns: boolean
      }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      cleanup_youtube_api_usage: { Args: never; Returns: number }
      get_resource_download_count: {
        Args: { _resource_category: string; _resource_name: string }
        Returns: number
      }
      get_service_attendance_count: {
        Args: { service_date_param: string; service_time_param: string }
        Returns: number
      }
      get_user_display_name: { Args: { _user_id: string }; Returns: string }
      get_youtube_api_usage_summary: {
        Args: { _hours?: number }
        Returns: {
          avg_quota_per_call: number
          cache_hit_rate: number
          function_name: string
          success_rate: number
          total_calls: number
          total_quota_units: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["church_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_attending_service: {
        Args: {
          service_date_param: string
          service_time_param: string
          user_id_param: string
        }
        Returns: boolean
      }
      log_youtube_api_usage: {
        Args: {
          _api_calls_made?: number
          _cached_response?: boolean
          _error_message?: string
          _function_name: string
          _quota_units_used?: number
          _success?: boolean
        }
        Returns: undefined
      }
      record_resource_download: {
        Args: {
          _ip_address?: unknown
          _resource_category: string
          _resource_name: string
          _user_agent?: string
        }
        Returns: string
      }
    }
    Enums: {
      church_role:
        | "choir"
        | "administrator"
        | "usher"
        | "pastor"
        | "campus_fellowship"
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
      church_role: [
        "choir",
        "administrator",
        "usher",
        "pastor",
        "campus_fellowship",
      ],
    },
  },
} as const
