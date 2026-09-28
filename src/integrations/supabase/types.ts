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
      analytics_events: {
        Row: {
          block_id: string | null
          block_type: string | null
          city: string | null
          country: string | null
          created_at: string
          destination: string | null
          event_type: string
          id: string
          item_label: string | null
          page_id: string
        }
        Insert: {
          block_id?: string | null
          block_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          destination?: string | null
          event_type: string
          id?: string
          item_label?: string | null
          page_id: string
        }
        Update: {
          block_id?: string | null
          block_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          destination?: string | null
          event_type?: string
          id?: string
          item_label?: string | null
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_visible: boolean
          page_id: string
          position: number
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id: string
          position?: number
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id?: string
          position?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_connections: {
        Row: {
          access_token: string
          created_at: string
          instagram_user_id: string
          last_error: string | null
          last_synced_at: string | null
          page_id: string
          token_expires_at: string
          token_issued_at: string
          updated_at: string
          username: string
        }
        Insert: {
          access_token: string
          created_at?: string
          instagram_user_id: string
          last_error?: string | null
          last_synced_at?: string | null
          page_id: string
          token_expires_at: string
          token_issued_at?: string
          updated_at?: string
          username: string
        }
        Update: {
          access_token?: string
          created_at?: string
          instagram_user_id?: string
          last_error?: string | null
          last_synced_at?: string | null
          page_id?: string
          token_expires_at?: string
          token_issued_at?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_connections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_disconnect_notices: {
        Row: {
          created_at: string
          page_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          page_id: string
          reason?: string
        }
        Update: {
          created_at?: string
          page_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_disconnect_notices_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          page_id: string | null
          return_origin: string
          state_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          page_id?: string | null
          return_origin: string
          state_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          page_id?: string | null
          return_origin?: string
          state_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_oauth_states_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_pending_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          instagram_user_id: string
          key_hash: string
          name: string
          profile_picture_url: string
          token_expires_at: string
          username: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          instagram_user_id: string
          key_hash: string
          name?: string
          profile_picture_url?: string
          token_expires_at: string
          username: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          instagram_user_id?: string
          key_hash?: string
          name?: string
          profile_picture_url?: string
          token_expires_at?: string
          username?: string
        }
        Relationships: []
      }
      instagram_posts: {
        Row: {
          caption: string
          created_at: string
          id: string
          image_url: string
          instagram_media_id: string
          is_hidden: boolean
          link_url: string
          media_type: string
          page_id: string
          permalink: string
          position: number
          posted_at: string
          updated_at: string
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          image_url: string
          instagram_media_id: string
          is_hidden?: boolean
          link_url?: string
          media_type: string
          page_id: string
          permalink?: string
          position?: number
          posted_at: string
          updated_at?: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          image_url?: string
          instagram_media_id?: string
          is_hidden?: boolean
          link_url?: string
          media_type?: string
          page_id?: string
          permalink?: string
          position?: number
          posted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_job_secrets: {
        Row: {
          created_at: string
          name: string
          secret: string
        }
        Insert: {
          created_at?: string
          name: string
          secret: string
        }
        Update: {
          created_at?: string
          name?: string
          secret?: string
        }
        Relationships: []
      }
      page_templates: {
        Row: {
          blocks: Json
          created_at: string
          design: Json
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          design?: Json
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          design?: Json
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          address: string
          background_color: string
          background_image_url: string | null
          background_type: string
          block_color: string
          block_shadow: string
          block_shape: string
          block_style: string
          block_text_color: string
          button_accent_color: string | null
          created_at: string
          display_name: string
          font: string
          footer_logo_url: string | null
          id: string
          instagram_handle: string
          market: string
          show_travelbase_logo: boolean
          text_color: string
          updated_at: string
        }
        Insert: {
          address: string
          background_color?: string
          background_image_url?: string | null
          background_type?: string
          block_color?: string
          block_shadow?: string
          block_shape?: string
          block_style?: string
          block_text_color?: string
          button_accent_color?: string | null
          created_at?: string
          display_name?: string
          font?: string
          footer_logo_url?: string | null
          id?: string
          instagram_handle?: string
          market?: string
          show_travelbase_logo?: boolean
          text_color?: string
          updated_at?: string
        }
        Update: {
          address?: string
          background_color?: string
          background_image_url?: string | null
          background_type?: string
          block_color?: string
          block_shadow?: string
          block_shape?: string
          block_style?: string
          block_text_color?: string
          button_accent_color?: string | null
          created_at?: string
          display_name?: string
          font?: string
          footer_logo_url?: string | null
          id?: string
          instagram_handle?: string
          market?: string
          show_travelbase_logo?: boolean
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_daily: {
        Args: { _from: string; _page: string; _to: string }
        Returns: {
          button_clicks: number
          day: string
          post_clicks: number
          views: number
        }[]
      }
      analytics_locations: {
        Args: { _from: string; _page: string; _to: string }
        Returns: {
          city: string
          country: string
          views: number
        }[]
      }
      analytics_top_links: {
        Args: { _from: string; _page: string; _to: string }
        Returns: {
          block_type: string
          clicks: number
          destination: string
          item_label: string
        }[]
      }
      run_instagram_daily: { Args: never; Returns: undefined }
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
    Enums: {},
  },
} as const
