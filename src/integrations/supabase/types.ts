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
      bible_note_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_note_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "bible_note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_notes: {
        Row: {
          book: string
          category: string | null
          chapter: number
          color: string | null
          created_at: string | null
          folder_id: string | null
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
          folder_id?: string | null
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
          folder_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "bible_notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "bible_note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          call_type: string
          chat_id: string
          ended_at: string | null
          id: string
          initiated_by: string
          started_at: string | null
          status: string
        }
        Insert: {
          call_type: string
          chat_id: string
          ended_at?: string | null
          id?: string
          initiated_by: string
          started_at?: string | null
          status: string
        }
        Update: {
          call_type?: string
          chat_id?: string
          ended_at?: string | null
          id?: string
          initiated_by?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_calendar_events: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          location: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      choir_folders: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "choir_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_instrumental_resources: {
        Row: {
          created_at: string
          id: string
          location: string | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          title: string
          type: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      choir_setlist_info: {
        Row: {
          id: string
          info_type: string
          location: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          info_type: string
          location?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          info_type?: string
          location?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      choir_songs: {
        Row: {
          artist: string | null
          created_at: string
          folder_id: string
          id: string
          key: string | null
          location: string | null
          notes: string | null
          title: string
          url: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string
          folder_id: string
          id?: string
          key?: string | null
          location?: string | null
          notes?: string | null
          title: string
          url?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string
          folder_id?: string
          id?: string
          key?: string | null
          location?: string | null
          notes?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_songs_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "choir_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_weekly_set_songs: {
        Row: {
          artist: string | null
          created_at: string
          id: string
          instrumental_notes: string | null
          instrumental_url: string | null
          key: string | null
          library_song_id: string | null
          location: string | null
          set_type: string
          sort_order: number | null
          title: string
          url: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string
          id?: string
          instrumental_notes?: string | null
          instrumental_url?: string | null
          key?: string | null
          library_song_id?: string | null
          location?: string | null
          set_type: string
          sort_order?: number | null
          title: string
          url?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string
          id?: string
          instrumental_notes?: string | null
          instrumental_url?: string | null
          key?: string | null
          library_song_id?: string | null
          location?: string | null
          set_type?: string
          sort_order?: number | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_weekly_set_songs_library_song_id_fkey"
            columns: ["library_song_id"]
            isOneToOne: false
            referencedRelation: "choir_songs"
            referencedColumns: ["id"]
          },
        ]
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
      group_admins: {
        Row: {
          can_add_members: boolean | null
          can_edit_info: boolean | null
          can_remove_members: boolean | null
          chat_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          can_add_members?: boolean | null
          can_edit_info?: boolean | null
          can_remove_members?: boolean | null
          chat_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          can_add_members?: boolean | null
          can_edit_info?: boolean | null
          can_remove_members?: boolean | null
          chat_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_admins_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chats: {
        Row: {
          avatar_url: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          created_by_user: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_custom: boolean | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_user?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          name: string
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_user?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_chats_created_by_user_fkey"
            columns: ["created_by_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          user_metadata: Json | null
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
          user_metadata?: Json | null
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
          user_metadata?: Json | null
        }
        Relationships: []
      }
      project_expenses: {
        Row: {
          amount: number
          category: string
          created_by: string | null
          date_added: string | null
          id: string
          item_name: string
          status: string
        }
        Insert: {
          amount: number
          category: string
          created_by?: string | null
          date_added?: string | null
          id?: string
          item_name: string
          status?: string
        }
        Update: {
          amount?: number
          category?: string
          created_by?: string | null
          date_added?: string | null
          id?: string
          item_name?: string
          status?: string
        }
        Relationships: []
      }
      project_guests: {
        Row: {
          assigned_seat: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          organization: string | null
          personal_assistant: string | null
          role: string | null
          rsvp_status: string | null
        }
        Insert: {
          assigned_seat?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          organization?: string | null
          personal_assistant?: string | null
          role?: string | null
          rsvp_status?: string | null
        }
        Update: {
          assigned_seat?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          personal_assistant?: string | null
          role?: string | null
          rsvp_status?: string | null
        }
        Relationships: []
      }
      project_phases: {
        Row: {
          description: string | null
          end_date: string
          id: string
          name: string
          phase_description: string | null
          start_date: string
          status: string | null
          target_met: boolean | null
        }
        Insert: {
          description?: string | null
          end_date: string
          id?: string
          name: string
          phase_description?: string | null
          start_date: string
          status?: string | null
          target_met?: boolean | null
        }
        Update: {
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          phase_description?: string | null
          start_date?: string
          status?: string | null
          target_met?: boolean | null
        }
        Relationships: []
      }
      project_settings: {
        Row: {
          brief_overview: string | null
          brief_subtitle: string | null
          brief_title: string | null
          id: string
          is_manual_progress: boolean | null
          key_responsibilities: Json | null
          manual_progress: number | null
          overall_progress: number | null
          strategic_objective: string | null
          total_budget: number | null
          unit_formation_plan_meeting: string | null
          unit_formation_plan_pastor: string | null
          updated_at: string | null
        }
        Insert: {
          brief_overview?: string | null
          brief_subtitle?: string | null
          brief_title?: string | null
          id: string
          is_manual_progress?: boolean | null
          key_responsibilities?: Json | null
          manual_progress?: number | null
          overall_progress?: number | null
          strategic_objective?: string | null
          total_budget?: number | null
          unit_formation_plan_meeting?: string | null
          unit_formation_plan_pastor?: string | null
          updated_at?: string | null
        }
        Update: {
          brief_overview?: string | null
          brief_subtitle?: string | null
          brief_title?: string | null
          id?: string
          is_manual_progress?: boolean | null
          key_responsibilities?: Json | null
          manual_progress?: number | null
          overall_progress?: number | null
          strategic_objective?: string | null
          total_budget?: number | null
          unit_formation_plan_meeting?: string | null
          unit_formation_plan_pastor?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          is_immediate: boolean | null
          sort_order: number | null
          task_text: string
          unit_name: string
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_immediate?: boolean | null
          sort_order?: number | null
          task_text: string
          unit_name: string
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_immediate?: boolean | null
          sort_order?: number | null
          task_text?: string
          unit_name?: string
        }
        Relationships: []
      }
      project_tools: {
        Row: {
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          name: string
          sort_order: number | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          name: string
          sort_order?: number | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          url?: string | null
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
      service_feedback: {
        Row: {
          concerns: string | null
          created_at: string
          didnt_work_well: string | null
          enjoyed_most: string | null
          id: string
          suggestions: string | null
          user_id: string | null
          want_more_of: string | null
        }
        Insert: {
          concerns?: string | null
          created_at?: string
          didnt_work_well?: string | null
          enjoyed_most?: string | null
          id?: string
          suggestions?: string | null
          user_id?: string | null
          want_more_of?: string | null
        }
        Update: {
          concerns?: string | null
          created_at?: string
          didnt_work_well?: string | null
          enjoyed_most?: string | null
          id?: string
          suggestions?: string | null
          user_id?: string | null
          want_more_of?: string | null
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
      unit_information: {
        Row: {
          created_at: string | null
          description: string | null
          full_description: string | null
          id: string
          is_existing_unit: boolean | null
          unit_name: string
          unit_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          full_description?: string | null
          id?: string
          is_existing_unit?: boolean | null
          unit_name: string
          unit_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          full_description?: string | null
          id?: string
          is_existing_unit?: boolean | null
          unit_name?: string
          unit_type?: string | null
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
      user_presence: {
        Row: {
          is_online: boolean | null
          last_seen: string | null
          status_message: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          is_online?: boolean | null
          last_seen?: string | null
          status_message?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          is_online?: boolean | null
          last_seen?: string | null
          status_message?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      is_chat_member: { Args: { _chat_id: string }; Returns: boolean }
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
