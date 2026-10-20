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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          published: boolean
          sort_order: number
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      board_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          instagram: string | null
          name: string
          photo_url: string | null
          role: string
          sector: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          instagram?: string | null
          name: string
          photo_url?: string | null
          role: string
          sector?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          instagram?: string | null
          name?: string
          photo_url?: string | null
          role?: string
          sector?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_schedule: {
        Row: {
          event_id: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          event_id: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          event_id?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_schedule_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          category: Database["public"]["Enums"]["event_category"]
          certificate_enabled: boolean
          certificate_hours: number | null
          created_at: string
          description: string | null
          ends_at: string | null
          featured: boolean
          id: string
          image_url: string | null
          location: string | null
          published: boolean
          registration_closes_at: string | null
          registration_open: boolean
          slug: string
          starts_at: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          category?: Database["public"]["Enums"]["event_category"]
          certificate_enabled?: boolean
          certificate_hours?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          location?: string | null
          published?: boolean
          registration_closes_at?: string | null
          registration_open?: boolean
          slug: string
          starts_at: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          category?: Database["public"]["Enums"]["event_category"]
          certificate_enabled?: boolean
          certificate_hours?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          location?: string | null
          published?: boolean
          registration_closes_at?: string | null
          registration_open?: boolean
          slug?: string
          starts_at?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size: string | null
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          size?: string | null
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          code: string
          consent_at: string
          cpf: string
          created_at: string
          email: string
          fee: number
          full_name: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          phone: string
          ra: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          code?: string
          consent_at: string
          cpf: string
          created_at?: string
          email: string
          fee?: number
          full_name: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          phone: string
          ra?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          code?: string
          consent_at?: string
          cpf?: string
          created_at?: string
          email?: string
          fee?: number
          full_name?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          phone?: string
          ra?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          sizes: string[]
          sort_order: number
          status: Database["public"]["Enums"]["product_status"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          sizes?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sizes?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          checked_in_at: string | null
          confirmation_sent_at: string | null
          created_at: string
          email: string
          event_id: string
          full_name: string
          id: string
          ra: string
          reminder_sent_at: string | null
        }
        Insert: {
          checked_in_at?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          email: string
          event_id: string
          full_name: string
          id?: string
          ra: string
          reminder_sent_at?: string | null
        }
        Update: {
          checked_in_at?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          ra?: string
          reminder_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      event_spots_taken: { Args: { _event_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      issue_certificate: {
        Args: { _email: string; _event_id: string; _ra: string }
        Returns: Json
      }
      list_board: {
        Args: never
        Returns: {
          email: string
          is_owner: boolean
          since: string
          user_id: string
        }[]
      }
      register_for_event: {
        Args: {
          _email: string
          _event_id: string
          _full_name: string
          _ra: string
          _website?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "aluno" | "owner"
      event_category: "faculdade" | "festa" | "esporte" | "outro"
      order_status:
        | "aguardando_pagamento"
        | "pago"
        | "em_producao"
        | "aguardando_retirada"
        | "entregue"
        | "cancelado"
      payment_method: "pix" | "cartao"
      product_status: "disponivel" | "esgotado" | "em_breve"
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
      app_role: ["admin", "aluno", "owner"],
      event_category: ["faculdade", "festa", "esporte", "outro"],
      order_status: [
        "aguardando_pagamento",
        "pago",
        "em_producao",
        "aguardando_retirada",
        "entregue",
        "cancelado",
      ],
      payment_method: ["pix", "cartao"],
      product_status: ["disponivel", "esgotado", "em_breve"],
    },
  },
} as const
