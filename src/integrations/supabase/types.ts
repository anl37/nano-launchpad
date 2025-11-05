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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_patterns: {
        Row: {
          day_type: string
          frequency_score: number
          id: string
          last_visit_at: string
          place_type: string
          time_of_day: string
          updated_at: string
          user_id: string
          visit_count: number
        }
        Insert: {
          day_type: string
          frequency_score?: number
          id?: string
          last_visit_at?: string
          place_type: string
          time_of_day: string
          updated_at?: string
          user_id: string
          visit_count?: number
        }
        Update: {
          day_type?: string
          frequency_score?: number
          id?: string
          last_visit_at?: string
          place_type?: string
          time_of_day?: string
          updated_at?: string
          user_id?: string
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_summaries: {
        Row: {
          avg_dwell_min: number
          created_at: string
          day_type: string
          frequency_denominator: number | null
          frequency_numerator: number | null
          frequency_share: number
          id: string
          last_visit_at: string | null
          place_type: string
          recency_score: number
          summary_date: string
          time_of_day: string
          time_window: string
          total_dwell_min: number
          updated_at: string
          user_id: string
          visit_count: number
          window_end_min: number | null
          window_start_min: number | null
        }
        Insert: {
          avg_dwell_min?: number
          created_at?: string
          day_type: string
          frequency_denominator?: number | null
          frequency_numerator?: number | null
          frequency_share?: number
          id?: string
          last_visit_at?: string | null
          place_type: string
          recency_score?: number
          summary_date: string
          time_of_day: string
          time_window: string
          total_dwell_min?: number
          updated_at?: string
          user_id: string
          visit_count?: number
          window_end_min?: number | null
          window_start_min?: number | null
        }
        Update: {
          avg_dwell_min?: number
          created_at?: string
          day_type?: string
          frequency_denominator?: number | null
          frequency_numerator?: number | null
          frequency_share?: number
          id?: string
          last_visit_at?: string | null
          place_type?: string
          recency_score?: number
          summary_date?: string
          time_of_day?: string
          time_window?: string
          total_dwell_min?: number
          updated_at?: string
          user_id?: string
          visit_count?: number
          window_end_min?: number | null
          window_start_min?: number | null
        }
        Relationships: []
      }
      compatibility_weights: {
        Row: {
          behavior_weight: number
          data_points_count: number
          feedback_weight: number
          interest_weight: number
          updated_at: string
          user_id: string
        }
        Insert: {
          behavior_weight?: number
          data_points_count?: number
          feedback_weight?: number
          interest_weight?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          behavior_weight?: number
          data_points_count?: number
          feedback_weight?: number
          interest_weight?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_weights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_sessions: {
        Row: {
          confidence: number
          created_at: string
          day_of_week: string | null
          day_type: string | null
          dwell_min: number
          end_ts: string
          geohash: string
          id: string
          lat: number
          lng: number
          place_id: string | null
          place_name: string | null
          place_type: string
          start_ts: string
          time_label: string | null
          time_of_day: string | null
          time_window: string | null
          user_id: string
          user_timezone: string
          window_end_min: number | null
          window_start_min: number | null
        }
        Insert: {
          confidence?: number
          created_at?: string
          day_of_week?: string | null
          day_type?: string | null
          dwell_min?: number
          end_ts: string
          geohash: string
          id?: string
          lat: number
          lng: number
          place_id?: string | null
          place_name?: string | null
          place_type?: string
          start_ts: string
          time_label?: string | null
          time_of_day?: string | null
          time_window?: string | null
          user_id: string
          user_timezone?: string
          window_end_min?: number | null
          window_start_min?: number | null
        }
        Update: {
          confidence?: number
          created_at?: string
          day_of_week?: string | null
          day_type?: string | null
          dwell_min?: number
          end_ts?: string
          geohash?: string
          id?: string
          lat?: number
          lng?: number
          place_id?: string | null
          place_name?: string | null
          place_type?: string
          start_ts?: string
          time_label?: string | null
          time_of_day?: string | null
          time_window?: string | null
          user_id?: string
          user_timezone?: string
          window_end_min?: number | null
          window_start_min?: number | null
        }
        Relationships: []
      }
      location_visits: {
        Row: {
          confidence: number | null
          created_at: string
          day_of_week: string | null
          day_type: string
          id: string
          lat: number
          lng: number
          place_id: string | null
          place_name: string | null
          place_type: string
          time_label: string | null
          time_of_day: string
          time_window: string | null
          timestamp_utc: string | null
          types: string[] | null
          user_id: string
          user_timezone_at_event: string | null
          visited_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          day_of_week?: string | null
          day_type: string
          id?: string
          lat: number
          lng: number
          place_id?: string | null
          place_name?: string | null
          place_type: string
          time_label?: string | null
          time_of_day: string
          time_window?: string | null
          timestamp_utc?: string | null
          types?: string[] | null
          user_id: string
          user_timezone_at_event?: string | null
          visited_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          day_of_week?: string | null
          day_type?: string
          id?: string
          lat?: number
          lng?: number
          place_id?: string | null
          place_name?: string | null
          place_type?: string
          time_label?: string | null
          time_of_day?: string
          time_window?: string | null
          timestamp_utc?: string | null
          types?: string[] | null
          user_id?: string
          user_timezone_at_event?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          id: string
          landmark: string | null
          last_seen_together_at: string | null
          match_explanation: string | null
          meet_code: string | null
          pair_id: string
          shared_emoji_code: string | null
          shared_interests: string[]
          status: string
          uid_a: string
          uid_b: string
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          landmark?: string | null
          last_seen_together_at?: string | null
          match_explanation?: string | null
          meet_code?: string | null
          pair_id: string
          shared_emoji_code?: string | null
          shared_interests?: string[]
          status?: string
          uid_a: string
          uid_b: string
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          landmark?: string | null
          last_seen_together_at?: string | null
          match_explanation?: string | null
          meet_code?: string | null
          pair_id?: string
          shared_emoji_code?: string | null
          shared_interests?: string[]
          status?: string
          uid_a?: string
          uid_b?: string
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
        }
        Relationships: []
      }
      meetup_feedback: {
        Row: {
          created_at: string
          feedback_text: string | null
          id: string
          match_id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          match_id: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          match_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      place_cache: {
        Row: {
          first_seen_at: string
          last_used_at: string
          lat: number
          lng: number
          place_id: string
          place_name: string | null
          place_type: string
          types: string[] | null
          use_count: number
        }
        Insert: {
          first_seen_at?: string
          last_used_at?: string
          lat: number
          lng: number
          place_id: string
          place_name?: string | null
          place_type?: string
          types?: string[] | null
          use_count?: number
        }
        Update: {
          first_seen_at?: string
          last_used_at?: string
          lat?: number
          lng?: number
          place_id?: string
          place_name?: string | null
          place_type?: string
          types?: string[] | null
          use_count?: number
        }
        Relationships: []
      }
      place_enrichment_queue: {
        Row: {
          created_at: string | null
          id: string
          last_attempt_at: string | null
          lat: number
          lng: number
          retry_count: number | null
          session_id: string | null
          status: string | null
          user_id: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          lat: number
          lng: number
          retry_count?: number | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          lat?: number
          lng?: number
          retry_count?: number | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_enrichment_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "location_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_enrichment_queue_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "location_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      presence: {
        Row: {
          geohash: string
          lat: number
          lng: number
          updated_at: string
          user_id: string
        }
        Insert: {
          geohash: string
          lat: number
          lng: number
          updated_at?: string
          user_id: string
        }
        Update: {
          geohash?: string
          lat?: number
          lng?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_fingerprint: Json | null
          auto_accept_connections: boolean | null
          availability_status: string | null
          avatar_url: string | null
          created_at: string | null
          emoji_signature: string | null
          geohash: string | null
          id: string
          interests: string[] | null
          is_visible: boolean | null
          lat: number | null
          lng: number | null
          location_accuracy: number | null
          location_updated_at: string | null
          name: string | null
          onboarded: boolean | null
          updated_at: string | null
        }
        Insert: {
          activity_fingerprint?: Json | null
          auto_accept_connections?: boolean | null
          availability_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          emoji_signature?: string | null
          geohash?: string | null
          id: string
          interests?: string[] | null
          is_visible?: boolean | null
          lat?: number | null
          lng?: number | null
          location_accuracy?: number | null
          location_updated_at?: string | null
          name?: string | null
          onboarded?: boolean | null
          updated_at?: string | null
        }
        Update: {
          activity_fingerprint?: Json | null
          auto_accept_connections?: boolean | null
          availability_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          emoji_signature?: string | null
          geohash?: string | null
          id?: string
          interests?: string[] | null
          is_visible?: boolean | null
          lat?: number | null
          lng?: number | null
          location_accuracy?: number | null
          location_updated_at?: string | null
          name?: string | null
          onboarded?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      suggested_matches: {
        Row: {
          action: string | null
          action_at: string | null
          behavioral_overlap: Json | null
          compatibility_score: number
          created_at: string | null
          id: string
          match_reason: string | null
          shared_interests: string[] | null
          shown_at: string | null
          suggested_user_id: string
          user_id: string
        }
        Insert: {
          action?: string | null
          action_at?: string | null
          behavioral_overlap?: Json | null
          compatibility_score?: number
          created_at?: string | null
          id?: string
          match_reason?: string | null
          shared_interests?: string[] | null
          shown_at?: string | null
          suggested_user_id: string
          user_id: string
        }
        Update: {
          action?: string | null
          action_at?: string | null
          behavioral_overlap?: Json | null
          compatibility_score?: number
          created_at?: string | null
          id?: string
          match_reason?: string | null
          shared_interests?: string[] | null
          shown_at?: string | null
          suggested_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestion_actions: {
        Row: {
          action: string
          action_at: string | null
          context: Json | null
          id: string
          suggestion_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          action_at?: string | null
          context?: Json | null
          id?: string
          suggestion_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          action_at?: string | null
          context?: Json | null
          id?: string
          suggestion_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_actions_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggested_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_impressions: {
        Row: {
          id: string
          scroll_depth_percent: number | null
          suggestion_id: string | null
          user_id: string
          view_duration_seconds: number | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          scroll_depth_percent?: number | null
          suggestion_id?: string | null
          user_id: string
          view_duration_seconds?: number | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          scroll_depth_percent?: number | null
          suggestion_id?: string | null
          user_id?: string
          view_duration_seconds?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_impressions_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggested_matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_activity_summaries_with_recency: {
        Row: {
          avg_dwell_min: number | null
          computed_recency_score: number | null
          created_at: string | null
          day_type: string | null
          days_ago: number | null
          frequency_denominator: number | null
          frequency_numerator: number | null
          frequency_share: number | null
          id: string | null
          last_visit_at: string | null
          place_type: string | null
          recency_score: number | null
          summary_date: string | null
          time_of_day: string | null
          time_window: string | null
          total_dwell_min: number | null
          updated_at: string | null
          user_id: string | null
          visit_count: number | null
          window_end_min: number | null
          window_start_min: number | null
        }
        Relationships: []
      }
      vw_activity_summaries_pretty: {
        Row: {
          avg_dwell_min: number | null
          created_at: string | null
          day_type: string | null
          end_time: string | null
          frequency_share: number | null
          id: string | null
          last_visit_at: string | null
          place_type: string | null
          recency_score: number | null
          start_time: string | null
          summary_date: string | null
          time_of_day: string | null
          time_window_label: string | null
          total_dwell_min: number | null
          updated_at: string | null
          user_id: string | null
          visit_count: number | null
          window_end_min: number | null
          window_start_min: number | null
        }
        Insert: {
          avg_dwell_min?: number | null
          created_at?: string | null
          day_type?: string | null
          end_time?: never
          frequency_share?: number | null
          id?: string | null
          last_visit_at?: string | null
          place_type?: string | null
          recency_score?: number | null
          start_time?: never
          summary_date?: string | null
          time_of_day?: string | null
          time_window_label?: string | null
          total_dwell_min?: number | null
          updated_at?: string | null
          user_id?: string | null
          visit_count?: number | null
          window_end_min?: number | null
          window_start_min?: number | null
        }
        Update: {
          avg_dwell_min?: number | null
          created_at?: string | null
          day_type?: string | null
          end_time?: never
          frequency_share?: number | null
          id?: string | null
          last_visit_at?: string | null
          place_type?: string | null
          recency_score?: number | null
          start_time?: never
          summary_date?: string | null
          time_of_day?: string | null
          time_window_label?: string | null
          total_dwell_min?: number | null
          updated_at?: string | null
          user_id?: string | null
          visit_count?: number | null
          window_end_min?: number | null
          window_start_min?: number | null
        }
        Relationships: []
      }
      vw_compatibility_weights_normalized: {
        Row: {
          behavior_weight: number | null
          behavior_weight_normalized: number | null
          data_points_count: number | null
          feedback_weight: number | null
          feedback_weight_normalized: number | null
          interest_weight: number | null
          interest_weight_normalized: number | null
          updated_at: string | null
          user_id: string | null
          weight_sum_deviation: number | null
        }
        Insert: {
          behavior_weight?: number | null
          behavior_weight_normalized?: never
          data_points_count?: number | null
          feedback_weight?: number | null
          feedback_weight_normalized?: never
          interest_weight?: number | null
          interest_weight_normalized?: never
          updated_at?: string | null
          user_id?: string | null
          weight_sum_deviation?: never
        }
        Update: {
          behavior_weight?: number | null
          behavior_weight_normalized?: never
          data_points_count?: number | null
          feedback_weight?: number | null
          feedback_weight_normalized?: never
          interest_weight?: number | null
          interest_weight_normalized?: never
          updated_at?: string | null
          user_id?: string | null
          weight_sum_deviation?: never
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_weights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_stale_presence: { Args: never; Returns: number }
      compute_activity_summary: {
        Args: { target_date?: string; target_user_id: string }
        Returns: undefined
      }
      day_type_category: { Args: { local_ts: string }; Returns: string }
      generate_pair_id: {
        Args: { user_a: string; user_b: string }
        Returns: string
      }
      parse_time_window: {
        Args: { window_str: string }
        Returns: {
          end_min: number
          start_min: number
        }[]
      }
      process_place_enrichment_queue: {
        Args: { batch_size?: number; max_retries?: number }
        Returns: number
      }
      recalculate_frequency_scores: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      refresh_activity_recency: { Args: never; Returns: undefined }
      sessionize_recent_visits:
        | {
            Args: { gap_threshold_minutes?: number; target_user_id: string }
            Returns: number
          }
        | {
            Args: {
              gap_threshold_minutes?: number
              lookback_hours?: number
              target_user_id?: string
            }
            Returns: number
          }
      time_of_day_category: { Args: { local_ts: string }; Returns: string }
      time_of_day_label: { Args: { local_ts: string }; Returns: string }
      two_hour_bucket: { Args: { local_ts: string }; Returns: string }
      update_activity_patterns_from_sessions: {
        Args: { lookback_days?: number; target_user_id?: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      session_state: {
        user_id: string | null
        place_id: string | null
        place_name: string | null
        place_type: string | null
        lat: number | null
        lng: number | null
        geohash: string | null
        start_ts: string | null
        visited_at: string | null
        confidence: number | null
        user_timezone_at_event: string | null
        time_window: string | null
        time_of_day: string | null
        day_type: string | null
      }
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
    Enums: {},
  },
} as const
