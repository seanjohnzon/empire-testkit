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
      academy_upgrades: {
        Row: {
          bonus_pct: number
          cooldown_until: string | null
          owner: string
          tier: number
        }
        Insert: {
          bonus_pct?: number
          cooldown_until?: string | null
          owner: string
          tier?: number
        }
        Update: {
          bonus_pct?: number
          cooldown_until?: string | null
          owner?: string
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_upgrades_owner_fkey"
            columns: ["owner"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      claim_receipts: {
        Row: {
          amount: number
          created_at: string | null
          from_ts: string
          id: string
          owner: string
          season_id: string
          to_ts: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          from_ts: string
          id?: string
          owner: string
          season_id: string
          to_ts: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          from_ts?: string
          id?: string
          owner?: string
          season_id?: string
          to_ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_receipts_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "claim_receipts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_currency: {
        Row: {
          iron: number
          owner: string
          war_bonds: number
        }
        Insert: {
          iron?: number
          owner: string
          war_bonds?: number
        }
        Update: {
          iron?: number
          owner?: string
          war_bonds?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_currency_owner_fkey"
            columns: ["owner"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          id: number
          season_id: string
          taken_at: string
          top: Json
        }
        Insert: {
          id?: number
          season_id: string
          taken_at?: string
          top: Json
        }
        Update: {
          id?: number
          season_id?: string
          taken_at?: string
          top?: Json
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_openings: {
        Row: {
          id: string
          opened_at: string | null
          owner: string
          pack_type: string
          pity_count: number | null
          result_unit: string | null
        }
        Insert: {
          id?: string
          opened_at?: string | null
          owner: string
          pack_type: string
          pity_count?: number | null
          result_unit?: string | null
        }
        Update: {
          id?: string
          opened_at?: string | null
          owner?: string
          pack_type?: string
          pity_count?: number | null
          result_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pack_openings_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pack_openings_pack_type_fkey"
            columns: ["pack_type"]
            isOneToOne: false
            referencedRelation: "pack_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_openings_result_unit_fkey"
            columns: ["result_unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_types: {
        Row: {
          drops: Json
          id: string
          name: string
          pity_threshold: number | null
          price_bonds: number
        }
        Insert: {
          drops: Json
          id?: string
          name: string
          pity_threshold?: number | null
          price_bonds: number
        }
        Update: {
          drops?: Json
          id?: string
          name?: string
          pity_threshold?: number | null
          price_bonds?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          last_claim_at: string | null
          mp: number | null
          season_id: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          last_claim_at?: string | null
          mp?: number | null
          season_id?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          last_claim_at?: string | null
          mp?: number | null
          season_id?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      rarities: {
        Row: {
          base_power: number
          code: string
          weight: number
        }
        Insert: {
          base_power: number
          code: string
          weight: number
        }
        Update: {
          base_power?: number
          code?: string
          weight?: number
        }
        Relationships: []
      }
      seasons: {
        Row: {
          base_rate_per_min: number
          ends_at: string
          halving_days: number
          id: string
          name: string
          starts_at: string
        }
        Insert: {
          base_rate_per_min: number
          ends_at: string
          halving_days?: number
          id?: string
          name: string
          starts_at: string
        }
        Update: {
          base_rate_per_min?: number
          ends_at?: string
          halving_days?: number
          id?: string
          name?: string
          starts_at?: string
        }
        Relationships: []
      }
      unit_blueprints: {
        Row: {
          base_power: number
          id: string
          name: string
          rarity: string | null
          squad: string | null
          traits: string[] | null
        }
        Insert: {
          base_power: number
          id?: string
          name: string
          rarity?: string | null
          squad?: string | null
          traits?: string[] | null
        }
        Update: {
          base_power?: number
          id?: string
          name?: string
          rarity?: string | null
          squad?: string | null
          traits?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_blueprints_rarity_fkey"
            columns: ["rarity"]
            isOneToOne: false
            referencedRelation: "rarities"
            referencedColumns: ["code"]
          },
        ]
      }
      units: {
        Row: {
          blueprint: string
          created_at: string | null
          id: string
          level: number
          owner: string
          rank: number
        }
        Insert: {
          blueprint: string
          created_at?: string | null
          id?: string
          level?: number
          owner: string
          rank?: number
        }
        Update: {
          blueprint?: string
          created_at?: string | null
          id?: string
          level?: number
          owner?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "units_blueprint_fkey"
            columns: ["blueprint"]
            isOneToOne: false
            referencedRelation: "unit_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
