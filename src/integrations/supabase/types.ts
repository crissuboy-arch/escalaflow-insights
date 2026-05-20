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
      ai_analyses: {
        Row: {
          created_at: string
          creative_suggestions: Json | null
          desires: Json | null
          id: string
          is_demo: boolean
          mechanism: string | null
          mental_triggers: Json | null
          offer_id: string
          offer_structure: string | null
          pains: Json | null
          promise: string | null
          target_audience: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          creative_suggestions?: Json | null
          desires?: Json | null
          id?: string
          is_demo?: boolean
          mechanism?: string | null
          mental_triggers?: Json | null
          offer_id: string
          offer_structure?: string | null
          pains?: Json | null
          promise?: string | null
          target_audience?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          creative_suggestions?: Json | null
          desires?: Json | null
          id?: string
          is_demo?: boolean
          mechanism?: string | null
          mental_triggers?: Json | null
          offer_id?: string
          offer_structure?: string | null
          pains?: Json | null
          promise?: string | null
          target_audience?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "mined_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_history: {
        Row: {
          created_at: string
          id: string
          model: string | null
          module: string
          project_id: string | null
          prompt: Json
          response: Json
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          module: string
          project_id?: string | null
          prompt?: Json
          response?: Json
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          module?: string
          project_id?: string | null
          prompt?: Json
          response?: Json
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collected_ads: {
        Row: {
          ad_library_id: string | null
          ad_url: string | null
          advertiser: string
          copy: string | null
          country: string
          created_at: string
          creative_type: string | null
          cta: string | null
          favorite: boolean
          headline: string
          id: string
          image_url: string | null
          keyword: string | null
          niche: string
          platform: string
          raw: Json | null
          score: number
          source: string
          status: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ad_library_id?: string | null
          ad_url?: string | null
          advertiser?: string
          copy?: string | null
          country?: string
          created_at?: string
          creative_type?: string | null
          cta?: string | null
          favorite?: boolean
          headline?: string
          id?: string
          image_url?: string | null
          keyword?: string | null
          niche?: string
          platform?: string
          raw?: Json | null
          score?: number
          source?: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ad_library_id?: string | null
          ad_url?: string | null
          advertiser?: string
          copy?: string | null
          country?: string
          created_at?: string
          creative_type?: string | null
          cta?: string | null
          favorite?: boolean
          headline?: string
          id?: string
          image_url?: string | null
          keyword?: string | null
          niche?: string
          platform?: string
          raw?: Json | null
          score?: number
          source?: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      ebooks: {
        Row: {
          briefing: Json
          chapter_count: number
          chapters: Json
          cover_url: string | null
          created_at: string
          id: string
          layout: string
          mode: string
          niche: string | null
          outline: Json
          project_id: string | null
          source_ad_key: string | null
          status: string
          step: number
          subtitle: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          briefing?: Json
          chapter_count?: number
          chapters?: Json
          cover_url?: string | null
          created_at?: string
          id?: string
          layout?: string
          mode?: string
          niche?: string | null
          outline?: Json
          project_id?: string | null
          source_ad_key?: string | null
          status?: string
          step?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          briefing?: Json
          chapter_count?: number
          chapters?: Json
          cover_url?: string | null
          created_at?: string
          id?: string
          layout?: string
          mode?: string
          niche?: string | null
          outline?: Json
          project_id?: string | null
          source_ad_key?: string | null
          status?: string
          step?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mined_offers: {
        Row: {
          ads_count: number
          advertiser_name: string
          country: string
          created_at: string
          id: string
          image_url: string | null
          is_demo: boolean
          keyword: string | null
          niche: string
          platform: string
          scale_score: number
          status: Database["public"]["Enums"]["offer_status"]
          summary: string | null
        }
        Insert: {
          ads_count?: number
          advertiser_name: string
          country: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_demo?: boolean
          keyword?: string | null
          niche: string
          platform: string
          scale_score?: number
          status?: Database["public"]["Enums"]["offer_status"]
          summary?: string | null
        }
        Update: {
          ads_count?: number
          advertiser_name?: string
          country?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_demo?: boolean
          keyword?: string | null
          niche?: string
          platform?: string
          scale_score?: number
          status?: Database["public"]["Enums"]["offer_status"]
          summary?: string | null
        }
        Relationships: []
      }
      playbooks: {
        Row: {
          avatar: string | null
          briefing: Json
          cover_url: string | null
          created_at: string
          id: string
          niche: string | null
          project_id: string | null
          promise: string | null
          scenes: Json
          source_ad_key: string | null
          status: string
          step: number
          theme: string
          title: string
          unique_mechanism: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          briefing?: Json
          cover_url?: string | null
          created_at?: string
          id?: string
          niche?: string | null
          project_id?: string | null
          promise?: string | null
          scenes?: Json
          source_ad_key?: string | null
          status?: string
          step?: number
          theme?: string
          title?: string
          unique_mechanism?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          briefing?: Json
          cover_url?: string | null
          created_at?: string
          id?: string
          niche?: string | null
          project_id?: string | null
          promise?: string | null
          scenes?: Json
          source_ad_key?: string | null
          status?: string
          step?: number
          theme?: string
          title?: string
          unique_mechanism?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          preferred_language: string
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          preferred_language?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_assets: {
        Row: {
          created_at: string
          id: string
          kind: string
          meta: Json
          project_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          project_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          project_id?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      project_campaigns: {
        Row: {
          ad_copies: Json
          angles: Json
          audiences: Json
          created_at: string
          creatives: Json
          headlines: Json
          id: string
          name: string
          platform: string
          project_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_copies?: Json
          angles?: Json
          audiences?: Json
          created_at?: string
          creatives?: Json
          headlines?: Json
          id?: string
          name?: string
          platform: string
          project_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_copies?: Json
          angles?: Json
          audiences?: Json
          created_at?: string
          creatives?: Json
          headlines?: Json
          id?: string
          name?: string
          platform?: string
          project_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_outputs: {
        Row: {
          agent: string
          created_at: string
          error: string | null
          id: string
          kind: string
          payload: Json
          project_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          payload?: Json
          project_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          payload?: Json
          project_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_scores: {
        Row: {
          created_at: string
          dimension: string
          fixes: Json
          id: string
          next_action: string | null
          project_id: string
          strengths: Json
          user_id: string
          value: number
          weaknesses: Json
        }
        Insert: {
          created_at?: string
          dimension: string
          fixes?: Json
          id?: string
          next_action?: string | null
          project_id: string
          strengths?: Json
          user_id: string
          value?: number
          weaknesses?: Json
        }
        Update: {
          created_at?: string
          dimension?: string
          fixes?: Json
          id?: string
          next_action?: string | null
          project_id?: string
          strengths?: Json
          user_id?: string
          value?: number
          weaknesses?: Json
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          order_index: number
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          order_index?: number
          project_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          order_index?: number
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_timeline: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          project_id: string
          ref_id: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          project_id: string
          ref_id?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          project_id?: string
          ref_id?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          briefing: Json
          country: string | null
          cover_url: string | null
          created_at: string
          ebook_id: string | null
          id: string
          language: string
          last_opened_at: string | null
          meta: Json
          mode: string
          niche: string | null
          outline: Json
          playbook_id: string | null
          product_type: string | null
          source_ad_key: string | null
          status: string
          step: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          briefing?: Json
          country?: string | null
          cover_url?: string | null
          created_at?: string
          ebook_id?: string | null
          id?: string
          language?: string
          last_opened_at?: string | null
          meta?: Json
          mode?: string
          niche?: string | null
          outline?: Json
          playbook_id?: string | null
          product_type?: string | null
          source_ad_key?: string | null
          status?: string
          step?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          briefing?: Json
          country?: string | null
          cover_url?: string | null
          created_at?: string
          ebook_id?: string | null
          id?: string
          language?: string
          last_opened_at?: string | null
          meta?: Json
          mode?: string
          niche?: string | null
          outline?: Json
          playbook_id?: string | null
          product_type?: string | null
          source_ad_key?: string | null
          status?: string
          step?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_offers: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "mined_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ad_actions: {
        Row: {
          action: Database["public"]["Enums"]["ad_action"]
          ad_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["ad_action"]
          ad_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["ad_action"]
          ad_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ad_actions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "collected_ads"
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
      ad_action: "saved" | "favorite" | "scaled"
      app_role: "admin" | "user"
      offer_status: "teste" | "validando" | "escalando" | "quente"
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
      ad_action: ["saved", "favorite", "scaled"],
      app_role: ["admin", "user"],
      offer_status: ["teste", "validando", "escalando", "quente"],
    },
  },
} as const
