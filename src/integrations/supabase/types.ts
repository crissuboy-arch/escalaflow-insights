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
      analyses: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          mining_run_id: string | null
          offer_id: string | null
          project_id: string | null
          status: string
          title: string | null
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          mining_run_id?: string | null
          offer_id?: string | null
          project_id?: string | null
          status?: string
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          mining_run_id?: string | null
          offer_id?: string | null
          project_id?: string | null
          status?: string
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "mined_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      anuncios_escalados: {
        Row: {
          ai_analysis: Json | null
          comments: number
          created_at: string
          creator: string
          description: string
          enhanced_score: number
          hashtags: string[]
          hook: string
          id: string
          likes: number
          notes: string | null
          playbook: Json | null
          scaled_at: string
          shares: number
          source: string
          tags: string[] | null
          thumbnail_url: string
          user_id: string
          video_id: string
          video_url: string
          views: number
          viral_score: number
        }
        Insert: {
          ai_analysis?: Json | null
          comments?: number
          created_at?: string
          creator?: string
          description?: string
          enhanced_score?: number
          hashtags?: string[]
          hook?: string
          id?: string
          likes?: number
          notes?: string | null
          playbook?: Json | null
          scaled_at?: string
          shares?: number
          source?: string
          tags?: string[] | null
          thumbnail_url?: string
          user_id: string
          video_id?: string
          video_url?: string
          views?: number
          viral_score?: number
        }
        Update: {
          ai_analysis?: Json | null
          comments?: number
          created_at?: string
          creator?: string
          description?: string
          enhanced_score?: number
          hashtags?: string[]
          hook?: string
          id?: string
          likes?: number
          notes?: string | null
          playbook?: Json | null
          scaled_at?: string
          shares?: number
          source?: string
          tags?: string[] | null
          thumbnail_url?: string
          user_id?: string
          video_id?: string
          video_url?: string
          views?: number
          viral_score?: number
        }
        Relationships: []
      }
      anuncios_salvos: {
        Row: {
          ai_analysis: Json | null
          comments: number
          created_at: string
          creator: string
          description: string
          enhanced_score: number
          hashtags: string[]
          hook: string
          id: string
          likes: number
          notes: string | null
          shares: number
          source: string
          tags: string[] | null
          thumbnail_url: string
          user_id: string
          video_id: string
          video_url: string
          views: number
          viral_score: number
        }
        Insert: {
          ai_analysis?: Json | null
          comments?: number
          created_at?: string
          creator?: string
          description?: string
          enhanced_score?: number
          hashtags?: string[]
          hook?: string
          id?: string
          likes?: number
          notes?: string | null
          shares?: number
          source?: string
          tags?: string[] | null
          thumbnail_url?: string
          user_id: string
          video_id?: string
          video_url?: string
          views?: number
          viral_score?: number
        }
        Update: {
          ai_analysis?: Json | null
          comments?: number
          created_at?: string
          creator?: string
          description?: string
          enhanced_score?: number
          hashtags?: string[]
          hook?: string
          id?: string
          likes?: number
          notes?: string | null
          shares?: number
          source?: string
          tags?: string[] | null
          thumbnail_url?: string
          user_id?: string
          video_id?: string
          video_url?: string
          views?: number
          viral_score?: number
        }
        Relationships: []
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
          first_seen_at: string | null
          headline: string
          id: string
          image_url: string | null
          keyword: string | null
          landing_page_url: string | null
          last_seen_at: string | null
          mining_run_id: string | null
          niche: string
          offer_network: string | null
          offer_network_confidence: string | null
          platform: string
          raw: Json | null
          score: number
          source: string
          start_date: string | null
          status: string
          transcript_language: string | null
          transcript_original: string | null
          transcript_translated_pt: string | null
          updated_at: string
          user_id: string | null
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
          first_seen_at?: string | null
          headline?: string
          id?: string
          image_url?: string | null
          keyword?: string | null
          landing_page_url?: string | null
          last_seen_at?: string | null
          mining_run_id?: string | null
          niche?: string
          offer_network?: string | null
          offer_network_confidence?: string | null
          platform?: string
          raw?: Json | null
          score?: number
          source?: string
          start_date?: string | null
          status?: string
          transcript_language?: string | null
          transcript_original?: string | null
          transcript_translated_pt?: string | null
          updated_at?: string
          user_id?: string | null
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
          first_seen_at?: string | null
          headline?: string
          id?: string
          image_url?: string | null
          keyword?: string | null
          landing_page_url?: string | null
          last_seen_at?: string | null
          mining_run_id?: string | null
          niche?: string
          offer_network?: string | null
          offer_network_confidence?: string | null
          platform?: string
          raw?: Json | null
          score?: number
          source?: string
          start_date?: string | null
          status?: string
          transcript_language?: string | null
          transcript_original?: string | null
          transcript_translated_pt?: string | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      creators_salvos: {
        Row: {
          avg_views: number
          avg_viral_score: number
          creator: string
          id: string
          notes: string | null
          profile_url: string
          saved_at: string
          source: string
          top_hashtags: string[]
          total_videos: number
          user_id: string
        }
        Insert: {
          avg_views?: number
          avg_viral_score?: number
          creator: string
          id?: string
          notes?: string | null
          profile_url?: string
          saved_at?: string
          source?: string
          top_hashtags?: string[]
          total_videos?: number
          user_id: string
        }
        Update: {
          avg_views?: number
          avg_viral_score?: number
          creator?: string
          id?: string
          notes?: string | null
          profile_url?: string
          saved_at?: string
          source?: string
          top_hashtags?: string[]
          total_videos?: number
          user_id?: string
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
      extension_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          ad_id: string | null
          favorited_at: string
          id: string
          mining_run_id: string | null
          notes: string | null
          offer_id: string | null
          user_id: string
        }
        Insert: {
          ad_id?: string | null
          favorited_at?: string
          id?: string
          mining_run_id?: string | null
          notes?: string | null
          offer_id?: string | null
          user_id: string
        }
        Update: {
          ad_id?: string | null
          favorited_at?: string
          id?: string
          mining_run_id?: string | null
          notes?: string | null
          offer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "collected_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_mining_run_id_fkey"
            columns: ["mining_run_id"]
            isOneToOne: false
            referencedRelation: "mining_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "mined_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      google_trends_minerados: {
        Row: {
          ai_analysis: Json | null
          avg_interest: number
          created_at: string
          geo: string
          id: string
          keyword: string
          peak_interest: number
          points: Json | null
          related_queries: string[]
          related_topics: string[]
          timeframe: string
          trend: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          avg_interest?: number
          created_at?: string
          geo?: string
          id?: string
          keyword: string
          peak_interest?: number
          points?: Json | null
          related_queries?: string[]
          related_topics?: string[]
          timeframe?: string
          trend?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          avg_interest?: number
          created_at?: string
          geo?: string
          id?: string
          keyword?: string
          peak_interest?: number
          points?: Json | null
          related_queries?: string[]
          related_topics?: string[]
          timeframe?: string
          trend?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_minerados: {
        Row: {
          ai_analysis: Json | null
          caption: string
          comments_count: number
          created_at: string
          display_url: string
          engagement_score: number
          hashtags: string[]
          id: string
          likes_count: number
          mentions: string[]
          owner_full_name: string
          owner_username: string
          post_url: string
          raw: Json | null
          results_type: string
          search: string
          search_type: string
          short_code: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          caption?: string
          comments_count?: number
          created_at?: string
          display_url?: string
          engagement_score?: number
          hashtags?: string[]
          id?: string
          likes_count?: number
          mentions?: string[]
          owner_full_name?: string
          owner_username?: string
          post_url?: string
          raw?: Json | null
          results_type?: string
          search: string
          search_type?: string
          short_code: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          caption?: string
          comments_count?: number
          created_at?: string
          display_url?: string
          engagement_score?: number
          hashtags?: string[]
          id?: string
          likes_count?: number
          mentions?: string[]
          owner_full_name?: string
          owner_username?: string
          post_url?: string
          raw?: Json | null
          results_type?: string
          search?: string
          search_type?: string
          short_code?: string
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
      mining_runs: {
        Row: {
          completed_at: string | null
          country: string
          duration_ms: number | null
          error: string | null
          id: string
          language: string
          query: string
          results_count: number
          started_at: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          country?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          language?: string
          query: string
          results_count?: number
          started_at?: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          country?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          language?: string
          query?: string
          results_count?: number
          started_at?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          advertiser: string | null
          copy: string | null
          country: string | null
          created_at: string
          creative_type: string | null
          cta: string | null
          engagement: Json | null
          headline: string | null
          id: string
          keyword: string | null
          landing_page: string | null
          language: string | null
          mining_run_id: string | null
          niche: string | null
          platform: string | null
          score: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advertiser?: string | null
          copy?: string | null
          country?: string | null
          created_at?: string
          creative_type?: string | null
          cta?: string | null
          engagement?: Json | null
          headline?: string | null
          id?: string
          keyword?: string | null
          landing_page?: string | null
          language?: string | null
          mining_run_id?: string | null
          niche?: string | null
          platform?: string | null
          score?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advertiser?: string | null
          copy?: string | null
          country?: string | null
          created_at?: string
          creative_type?: string | null
          cta?: string | null
          engagement?: Json | null
          headline?: string | null
          id?: string
          keyword?: string | null
          landing_page?: string | null
          language?: string | null
          mining_run_id?: string | null
          niche?: string | null
          platform?: string | null
          score?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      page_builder_projects: {
        Row: {
          created_at: string
          design_system_id: string
          form_data: Json | null
          html: string
          id: string
          skill_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          design_system_id?: string
          form_data?: Json | null
          html?: string
          id?: string
          skill_id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          design_system_id?: string
          form_data?: Json | null
          html?: string
          id?: string
          skill_id?: string
          title?: string
          updated_at?: string
          user_id?: string
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
      produtos_minerados: {
        Row: {
          ai_analysis: Json | null
          category: string
          created_at: string
          currency: string
          discount: number
          id: string
          image_url: string
          opportunity_score: number
          original_price: number
          platform: string
          price: number
          product_id: string
          product_url: string
          query: string
          rating: number
          review_count: number
          seller: string
          sold_count: number
          title: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          category?: string
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          image_url?: string
          opportunity_score?: number
          original_price?: number
          platform: string
          price?: number
          product_id: string
          product_url?: string
          query: string
          rating?: number
          review_count?: number
          seller?: string
          sold_count?: number
          title?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          category?: string
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          image_url?: string
          opportunity_score?: number
          original_price?: number
          platform?: string
          price?: number
          product_id?: string
          product_url?: string
          query?: string
          rating?: number
          review_count?: number
          seller?: string
          sold_count?: number
          title?: string
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
          wp_app_password: string | null
          wp_url: string | null
          wp_user: string | null
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
          wp_app_password?: string | null
          wp_url?: string | null
          wp_user?: string | null
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
          wp_app_password?: string | null
          wp_url?: string | null
          wp_user?: string | null
        }
        Relationships: []
      }
      saved_ads: {
        Row: {
          ad_id: string | null
          id: string
          mining_run_id: string | null
          notes: string | null
          offer_id: string | null
          saved_at: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          ad_id?: string | null
          id?: string
          mining_run_id?: string | null
          notes?: string | null
          offer_id?: string | null
          saved_at?: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          ad_id?: string | null
          id?: string
          mining_run_id?: string | null
          notes?: string | null
          offer_id?: string | null
          saved_at?: string
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_ads_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "collected_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_ads_mining_run_id_fkey"
            columns: ["mining_run_id"]
            isOneToOne: false
            referencedRelation: "mining_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_ads_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "mined_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_offers: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          mining_run_id: string | null
          notes: string | null
          offer_id: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          mining_run_id?: string | null
          notes?: string | null
          offer_id: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          mining_run_id?: string | null
          notes?: string | null
          offer_id?: string
          tags?: string[] | null
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
      tiktok_minerados: {
        Row: {
          ai_analysis: Json | null
          audio_title: string
          comments: number
          create_time: string | null
          created_at: string
          creator: string
          description: string
          hashtag: string
          hashtags: string[]
          hook: string
          id: string
          likes: number
          shares: number
          thumbnail_url: string
          user_id: string
          video_id: string
          video_url: string
          views: number
          viral_score: number
        }
        Insert: {
          ai_analysis?: Json | null
          audio_title?: string
          comments?: number
          create_time?: string | null
          created_at?: string
          creator?: string
          description?: string
          hashtag: string
          hashtags?: string[]
          hook?: string
          id?: string
          likes?: number
          shares?: number
          thumbnail_url?: string
          user_id: string
          video_id: string
          video_url?: string
          views?: number
          viral_score?: number
        }
        Update: {
          ai_analysis?: Json | null
          audio_title?: string
          comments?: number
          create_time?: string | null
          created_at?: string
          creator?: string
          description?: string
          hashtag?: string
          hashtags?: string[]
          hook?: string
          id?: string
          likes?: number
          shares?: number
          thumbnail_url?: string
          user_id?: string
          video_id?: string
          video_url?: string
          views?: number
          viral_score?: number
        }
        Relationships: []
      }
      trends: {
        Row: {
          country: string | null
          created_at: string
          data: Json | null
          id: string
          language: string | null
          mining_run_id: string | null
          topic: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          language?: string | null
          mining_run_id?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          language?: string | null
          mining_run_id?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      youtube_minerados: {
        Row: {
          ai_analysis: Json | null
          channel_id: string
          channel_name: string
          comments: number
          created_at: string
          description: string
          duration: string
          hashtags: string[]
          id: string
          is_short: boolean
          likes: number
          published_at: string | null
          query: string
          thumbnail_url: string
          title: string
          user_id: string
          video_id: string
          video_url: string
          views: number
          viral_score: number
        }
        Insert: {
          ai_analysis?: Json | null
          channel_id?: string
          channel_name?: string
          comments?: number
          created_at?: string
          description?: string
          duration?: string
          hashtags?: string[]
          id?: string
          is_short?: boolean
          likes?: number
          published_at?: string | null
          query: string
          thumbnail_url?: string
          title?: string
          user_id: string
          video_id: string
          video_url?: string
          views?: number
          viral_score?: number
        }
        Update: {
          ai_analysis?: Json | null
          channel_id?: string
          channel_name?: string
          comments?: number
          created_at?: string
          description?: string
          duration?: string
          hashtags?: string[]
          id?: string
          is_short?: boolean
          likes?: number
          published_at?: string | null
          query?: string
          thumbnail_url?: string
          title?: string
          user_id?: string
          video_id?: string
          video_url?: string
          views?: number
          viral_score?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_mining_run: {
        Args: { _error?: string; _results_count?: number; _run_id: string }
        Returns: undefined
      }
      create_mining_run: {
        Args: {
          _country?: string
          _language?: string
          _query: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
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
