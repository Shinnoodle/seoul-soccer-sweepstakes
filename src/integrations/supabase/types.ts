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
      long_term_picks: {
        Row: {
          champion: string
          runner_up: string
          semi1: string
          semi2: string
          top_scorer: string
          updated_at: string
          user_id: string
        }
        Insert: {
          champion: string
          runner_up: string
          semi1: string
          semi2: string
          top_scorer: string
          updated_at?: string
          user_id: string
        }
        Update: {
          champion?: string
          runner_up?: string
          semi1?: string
          semi2?: string
          top_scorer?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_picks: {
        Row: {
          away_score: number
          home_score: number
          joker: boolean
          match_id: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          away_score: number
          home_score: number
          joker?: boolean
          match_id: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          away_score?: number
          home_score?: number
          joker?: boolean
          match_id?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_picks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team: string
          created_at: string
          finished: boolean
          home_score: number | null
          home_team: string
          id: string
          kickoff: string
          match_number: number
          stage: Database["public"]["Enums"]["match_stage"]
        }
        Insert: {
          away_score?: number | null
          away_team?: string
          created_at?: string
          finished?: boolean
          home_score?: number | null
          home_team?: string
          id?: string
          kickoff: string
          match_number: number
          stage: Database["public"]["Enums"]["match_stage"]
        }
        Update: {
          away_score?: number | null
          away_team?: string
          created_at?: string
          finished?: boolean
          home_score?: number | null
          home_team?: string
          id?: string
          kickoff?: string
          match_number?: number
          stage?: Database["public"]["Enums"]["match_stage"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      tournament_settings: {
        Row: {
          actual_champion: string | null
          actual_runner_up: string | null
          actual_semi1: string | null
          actual_semi2: string | null
          actual_top_scorer: string | null
          id: number
          start_at: string
        }
        Insert: {
          actual_champion?: string | null
          actual_runner_up?: string | null
          actual_semi1?: string | null
          actual_semi2?: string | null
          actual_top_scorer?: string | null
          id?: number
          start_at?: string
        }
        Update: {
          actual_champion?: string | null
          actual_runner_up?: string | null
          actual_semi1?: string | null
          actual_semi2?: string | null
          actual_top_scorer?: string | null
          id?: number
          start_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          display_name: string | null
          longterm_points: number | null
          match_points: number | null
          total_points: number | null
          user_id: string | null
        }
        Insert: {
          display_name?: string | null
          longterm_points?: never
          match_points?: never
          total_points?: never
          user_id?: string | null
        }
        Update: {
          display_name?: string | null
          longterm_points?: never
          match_points?: never
          total_points?: never
          user_id?: string | null
        }
        Relationships: []
      }
      pick_points: {
        Row: {
          finished: boolean | null
          joker: boolean | null
          kickoff: string | null
          match_id: string | null
          points: number | null
          result_class: string | null
          stage: Database["public"]["Enums"]["match_stage"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_picks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      compute_match_points: {
        Args: {
          a_away: number
          a_home: number
          p_away: number
          p_home: number
          p_stage: Database["public"]["Enums"]["match_stage"]
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      longterm_points: { Args: { _user_id: string }; Returns: number }
      match_kickoff_passed: { Args: { _match_id: string }; Returns: boolean }
      picked_user_ids: { Args: { _match_id: string }; Returns: string[] }
      tournament_started: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      match_stage: "group" | "r16" | "qf" | "sf" | "third" | "final"
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
      app_role: ["admin", "user"],
      match_stage: ["group", "r16", "qf", "sf", "third", "final"],
    },
  },
} as const
