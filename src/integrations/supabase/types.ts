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
    PostgrestVersion: "12.2.3"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string
          church_id: string
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
          church_id?: string
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
          church_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      app_activity: {
        Row: {
          area: string | null
          church_id: string
          created_at: string
          detail: Json | null
          device: string | null
          event: string
          id: number
          path: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          area?: string | null
          church_id?: string
          created_at?: string
          detail?: Json | null
          device?: string | null
          event: string
          id?: never
          path?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          area?: string | null
          church_id?: string
          created_at?: string
          detail?: Json | null
          device?: string | null
          event?: string
          id?: never
          path?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_activity_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      app_feedback: {
        Row: {
          can_contact: boolean
          church_id: string
          created_at: string
          device: string | null
          id: string
          kind: string | null
          message: string | null
          page: string | null
          rating: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          can_contact?: boolean
          church_id?: string
          created_at?: string
          device?: string | null
          id?: string
          kind?: string | null
          message?: string | null
          page?: string | null
          rating?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          can_contact?: boolean
          church_id?: string
          created_at?: string
          device?: string | null
          id?: string
          kind?: string | null
          message?: string | null
          page?: string | null
          rating?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_feedback_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
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
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
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
      choir_academy_modules: {
        Row: {
          category: string
          church_id: string
          content: string | null
          created_at: string
          description: string | null
          id: string
          location: string
          title: string
          video_url: string | null
        }
        Insert: {
          category: string
          church_id?: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location: string
          title: string
          video_url?: string | null
        }
        Update: {
          category?: string
          church_id?: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_academy_modules_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_academy_questions: {
        Row: {
          correct_answer_index: number
          created_at: string
          id: string
          options: Json
          question_text: string
          quiz_id: string | null
        }
        Insert: {
          correct_answer_index: number
          created_at?: string
          id?: string
          options: Json
          question_text: string
          quiz_id?: string | null
        }
        Update: {
          correct_answer_index?: number
          created_at?: string
          id?: string
          options?: Json
          question_text?: string
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_academy_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "choir_academy_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_academy_quizzes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string | null
          passing_score: number | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          passing_score?: number | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          passing_score?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "choir_academy_quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "choir_academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_calendar_events: {
        Row: {
          church_id: string
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
          church_id?: string
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
          church_id?: string
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
        Relationships: [
          {
            foreignKeyName: "choir_calendar_events_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_folders: {
        Row: {
          church_id: string
          created_at: string
          id: string
          location: string | null
          name: string
          parent_id: string | null
        }
        Insert: {
          church_id?: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          parent_id?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_folders_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
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
          church_id: string
          created_at: string
          id: string
          location: string | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          church_id?: string
          created_at?: string
          id?: string
          location?: string | null
          title: string
          type: string
          url?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          location?: string | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_instrumental_resources_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_passcodes: {
        Row: {
          church_id: string
          location: string
          passcode_hash: string
          updated_at: string
        }
        Insert: {
          church_id: string
          location: string
          passcode_hash: string
          updated_at?: string
        }
        Update: {
          church_id?: string
          location?: string
          passcode_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      choir_setlist_info: {
        Row: {
          church_id: string
          id: string
          info_type: string
          location: string | null
          updated_at: string
          value: string | null
          week_date: string | null
        }
        Insert: {
          church_id?: string
          id?: string
          info_type: string
          location?: string | null
          updated_at?: string
          value?: string | null
          week_date?: string | null
        }
        Update: {
          church_id?: string
          id?: string
          info_type?: string
          location?: string | null
          updated_at?: string
          value?: string | null
          week_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_setlist_info_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_songs: {
        Row: {
          artist: string | null
          church_id: string
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
          church_id?: string
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
          church_id?: string
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
            foreignKeyName: "choir_songs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
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
          church_id: string
          created_at: string
          id: string
          instrumental_notes: string | null
          instrumental_url: string | null
          key: string | null
          library_song_id: string | null
          location: string | null
          lyrics: string | null
          set_type: string
          sort_order: number | null
          title: string
          url: string | null
          week_date: string | null
        }
        Insert: {
          artist?: string | null
          church_id?: string
          created_at?: string
          id?: string
          instrumental_notes?: string | null
          instrumental_url?: string | null
          key?: string | null
          library_song_id?: string | null
          location?: string | null
          lyrics?: string | null
          set_type: string
          sort_order?: number | null
          title: string
          url?: string | null
          week_date?: string | null
        }
        Update: {
          artist?: string | null
          church_id?: string
          created_at?: string
          id?: string
          instrumental_notes?: string | null
          instrumental_url?: string | null
          key?: string | null
          library_song_id?: string | null
          location?: string | null
          lyrics?: string | null
          set_type?: string
          sort_order?: number | null
          title?: string
          url?: string | null
          week_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_weekly_set_songs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "choir_weekly_set_songs_library_song_id_fkey"
            columns: ["library_song_id"]
            isOneToOne: false
            referencedRelation: "choir_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      church_members: {
        Row: {
          church_id: string
          joined_at: string
          source: string
          status: string
          user_id: string
        }
        Insert: {
          church_id: string
          joined_at?: string
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          church_id?: string
          joined_at?: string
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "church_members_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          join_code: string
          join_mode: string
          name: string
          profile: Json
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code: string
          join_mode?: string
          name: string
          profile?: Json
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code?: string
          join_mode?: string
          name?: string
          profile?: Json
          slug?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          church_id: string
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
          church_id?: string
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
          church_id?: string
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
        Relationships: [
          {
            foreignKeyName: "donations_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          church_id: string
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
          church_id?: string
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
          church_id?: string
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
        Relationships: [
          {
            foreignKeyName: "events_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          church_id: string
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
          church_id?: string
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
          church_id?: string
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
            foreignKeyName: "group_chats_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
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
          church_id: string
          group_name: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          church_id?: string
          group_name: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          church_id?: string
          group_name?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          church_id: string
          created_at: string | null
          deleted_at: string | null
          group_name: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          church_id?: string
          created_at?: string | null
          deleted_at?: string | null
          group_name: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          church_id?: string
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
          {
            foreignKeyName: "group_messages_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      live_services: {
        Row: {
          church_id: string
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
          church_id?: string
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
          church_id?: string
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
        Relationships: [
          {
            foreignKeyName: "live_services_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          daily_verse_enabled: boolean
          daily_verse_last_sent: string | null
          daily_verse_time: string
          group_chat_notifications: boolean | null
          id: string
          reading_reminder_enabled: boolean
          reading_reminder_last_sent: string | null
          reading_reminder_time: string
          sound_enabled: boolean | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_verse_enabled?: boolean
          daily_verse_last_sent?: string | null
          daily_verse_time?: string
          group_chat_notifications?: boolean | null
          id?: string
          reading_reminder_enabled?: boolean
          reading_reminder_last_sent?: string | null
          reading_reminder_time?: string
          sound_enabled?: boolean | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_verse_enabled?: boolean
          daily_verse_last_sent?: string | null
          daily_verse_time?: string
          group_chat_notifications?: boolean | null
          id?: string
          reading_reminder_enabled?: boolean
          reading_reminder_last_sent?: string | null
          reading_reminder_time?: string
          sound_enabled?: boolean | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prayer_request_prayers: {
        Row: {
          created_at: string
          prayer_request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          prayer_request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          prayer_request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_request_prayers_prayer_request_id_fkey"
            columns: ["prayer_request_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_requests: {
        Row: {
          answered_at: string | null
          church_id: string
          content: string
          created_at: string | null
          id: string
          is_anonymous: boolean
          is_private: boolean | null
          testimony: string | null
          title: string
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          church_id?: string
          content: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_private?: boolean | null
          testimony?: string | null
          title: string
          user_id: string
        }
        Update: {
          answered_at?: string | null
          church_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_private?: boolean | null
          testimony?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          admin_id: string
          church_id: string
          id: string
          ip_address: unknown
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          access_type?: string
          accessed_at?: string | null
          admin_id: string
          church_id?: string
          id?: string
          ip_address?: unknown
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          admin_id?: string
          church_id?: string
          id?: string
          ip_address?: unknown
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_access_log_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
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
          church_id: string
          created_by: string | null
          date_added: string | null
          id: string
          item_name: string
          receipt_url: string | null
          status: string
        }
        Insert: {
          amount: number
          category: string
          church_id?: string
          created_by?: string | null
          date_added?: string | null
          id?: string
          item_name: string
          receipt_url?: string | null
          status?: string
        }
        Update: {
          amount?: number
          category?: string
          church_id?: string
          created_by?: string | null
          date_added?: string | null
          id?: string
          item_name?: string
          receipt_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      project_guests: {
        Row: {
          assigned_seat: string | null
          church_id: string
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
          church_id?: string
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
          church_id?: string
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          personal_assistant?: string | null
          role?: string | null
          rsvp_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_guests_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          church_id: string
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
          church_id?: string
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
          church_id?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          phase_description?: string | null
          start_date?: string
          status?: string | null
          target_met?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      project_settings: {
        Row: {
          brief_overview: string | null
          brief_subtitle: string | null
          brief_title: string | null
          church_id: string
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
          church_id?: string
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
          church_id?: string
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
        Relationships: [
          {
            foreignKeyName: "project_settings_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          church_id: string
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
          church_id?: string
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
          church_id?: string
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
        Relationships: [
          {
            foreignKeyName: "project_tasks_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tools: {
        Row: {
          church_id: string
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          name: string
          sort_order: number | null
          url: string | null
        }
        Insert: {
          church_id?: string
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          name: string
          sort_order?: number | null
          url?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tools_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          failure_count: number
          id: string
          last_success_at: string | null
          p256dh: string
          topics: string[]
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          failure_count?: number
          id?: string
          last_success_at?: string | null
          p256dh: string
          topics?: string[]
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          failure_count?: number
          id?: string
          last_success_at?: string | null
          p256dh?: string
          topics?: string[]
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
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
          church_id: string
          downloaded_at: string | null
          id: string
          ip_address: unknown
          resource_category: string
          resource_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          church_id?: string
          downloaded_at?: string | null
          id?: string
          ip_address?: unknown
          resource_category: string
          resource_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          church_id?: string
          downloaded_at?: string | null
          id?: string
          ip_address?: unknown
          resource_category?: string
          resource_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_downloads_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_series: {
        Row: {
          audio_url: string | null
          church_id: string
          created_at: string | null
          description: string | null
          download_url: string | null
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          audio_url?: string | null
          church_id?: string
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          audio_url?: string | null
          church_id?: string
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermon_series_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      service_attendance: {
        Row: {
          church_id: string
          created_at: string
          id: string
          service_date: string
          service_time: string
          user_id: string
        }
        Insert: {
          church_id?: string
          created_at?: string
          id?: string
          service_date: string
          service_time: string
          user_id: string
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          service_date?: string
          service_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_attendance_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      service_feedback: {
        Row: {
          church_id: string
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
          church_id?: string
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
          church_id?: string
          concerns?: string | null
          created_at?: string
          didnt_work_well?: string | null
          enjoyed_most?: string | null
          id?: string
          suggestions?: string | null
          user_id?: string | null
          want_more_of?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_feedback_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      songwriting_contributions: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          church_id: string
          content: string
          created_at: string
          id: string
          liked_by: string[]
          location: string
          reply_to: string | null
          section: string
          user_id: string | null
          week_date: string
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          church_id?: string
          content: string
          created_at?: string
          id?: string
          liked_by?: string[]
          location?: string
          reply_to?: string | null
          section?: string
          user_id?: string | null
          week_date: string
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          church_id?: string
          content?: string
          created_at?: string
          id?: string
          liked_by?: string[]
          location?: string
          reply_to?: string | null
          section?: string
          user_id?: string | null
          week_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "songwriting_contributions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "songwriting_contributions_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "songwriting_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      songwriting_song_lines: {
        Row: {
          added_by: string | null
          added_by_name: string | null
          church_id: string
          content: string
          created_at: string
          id: string
          location: string
          section: string
          sort_order: number
          source_contribution_id: string | null
          week_date: string
        }
        Insert: {
          added_by?: string | null
          added_by_name?: string | null
          church_id?: string
          content: string
          created_at?: string
          id?: string
          location?: string
          section?: string
          sort_order?: number
          source_contribution_id?: string | null
          week_date: string
        }
        Update: {
          added_by?: string | null
          added_by_name?: string | null
          church_id?: string
          content?: string
          created_at?: string
          id?: string
          location?: string
          section?: string
          sort_order?: number
          source_contribution_id?: string | null
          week_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "songwriting_song_lines_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      songwriting_themes: {
        Row: {
          church_id: string
          created_at: string
          created_by: string | null
          description: string | null
          focus_step: string | null
          id: string
          location: string
          scripture: string | null
          title: string
          updated_at: string
          week_date: string
        }
        Insert: {
          church_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          focus_step?: string | null
          id?: string
          location?: string
          scripture?: string | null
          title: string
          updated_at?: string
          week_date: string
        }
        Update: {
          church_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          focus_step?: string | null
          id?: string
          location?: string
          scripture?: string | null
          title?: string
          updated_at?: string
          week_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "songwriting_themes_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      study_guides: {
        Row: {
          church_id: string
          created_at: string | null
          description: string | null
          file_url: string
          id: string
          title: string
        }
        Insert: {
          church_id?: string
          created_at?: string | null
          description?: string | null
          file_url: string
          id?: string
          title: string
        }
        Update: {
          church_id?: string
          created_at?: string | null
          description?: string | null
          file_url?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_guides_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      team_follow_ups: {
        Row: {
          assigned_to: string
          church_id: string
          created_at: string
          id: string
          invited_by: string | null
          notes: string | null
          phone_number: string | null
          status: string | null
          visit_date: string | null
          visitor_name: string
        }
        Insert: {
          assigned_to: string
          church_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          notes?: string | null
          phone_number?: string | null
          status?: string | null
          visit_date?: string | null
          visitor_name: string
        }
        Update: {
          assigned_to?: string
          church_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          notes?: string | null
          phone_number?: string | null
          status?: string | null
          visit_date?: string | null
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_follow_ups_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_information: {
        Row: {
          church_id: string
          created_at: string | null
          description: string | null
          full_description: string | null
          id: string
          is_existing_unit: boolean | null
          unit_name: string
          unit_type: string | null
        }
        Insert: {
          church_id?: string
          created_at?: string | null
          description?: string | null
          full_description?: string | null
          id?: string
          is_existing_unit?: boolean | null
          unit_name: string
          unit_type?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          description?: string | null
          full_description?: string | null
          id?: string
          is_existing_unit?: boolean | null
          unit_name?: string
          unit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_information_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          audio_quality: string | null
          created_at: string | null
          id: string
          notifications_enabled: boolean | null
          sidebar_shortcuts: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_quality?: string | null
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          sidebar_shortcuts?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_quality?: string | null
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          sidebar_shortcuts?: Json | null
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
          church_id: string
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["church_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          church_id?: string
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["church_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          church_id?: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["church_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
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
      admin_activity_members: {
        Args: { search?: string }
        Returns: {
          areas: string[]
          avatar_url: string
          full_name: string
          last_at: string
          user_id: string
        }[]
      }
      admin_activity_overview: { Args: never; Returns: Json }
      answer_join_request: {
        Args: { p_accept: boolean; p_user: string }
        Returns: undefined
      }
      can_view_sensitive_profile_data: {
        Args: { _profile_user_id: string }
        Returns: boolean
      }
      choir_can_edit: { Args: { _location: string }; Returns: boolean }
      choir_module_location: { Args: { _module_id: string }; Returns: string }
      choir_passcode_hash: { Args: { _passcode: string }; Returns: string }
      choir_quiz_location: { Args: { _quiz_id: string }; Returns: string }
      choir_unlock: {
        Args: { _location: string; _passcode: string }
        Returns: boolean
      }
      church_admin_info: {
        Args: never
        Returns: {
          id: string
          join_code: string
          join_mode: string
          name: string
          profile: Json
          slug: string
        }[]
      }
      church_by_code: { Args: { code: string }; Returns: string }
      church_directory: {
        Args: { find_id?: string; find_slug?: string; search?: string }
        Returns: {
          id: string
          join_mode: string
          members: number
          name: string
          profile: Json
          slug: string
        }[]
      }
      church_join_requests: {
        Args: never
        Returns: {
          asked_at: string
          avatar_url: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      cleanup_youtube_api_usage: { Args: never; Returns: number }
      create_church: {
        Args: {
          p_join_mode: string
          p_name: string
          p_profile: Json
          p_role: string
          p_slug: string
        }
        Returns: {
          id: string
          join_code: string
          slug: string
        }[]
      }
      current_church_id: { Args: never; Returns: string }
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
      in_current_church: { Args: { _user_id: string }; Returns: boolean }
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
      join_church: { Args: { target: string }; Returns: string }
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
      reserved_church_slug: { Args: { _slug: string }; Returns: boolean }
      set_church_join_mode: {
        Args: { p_join_mode: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
