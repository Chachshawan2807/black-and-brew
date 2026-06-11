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
      audit_logs: {
        Row: {
          action_type: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          status: string | null
          timestamp: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          status?: string | null
          timestamp?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          status?: string | null
          timestamp?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          id: string
          event_type: string
          occurred_at: string
          ip_address: string | null
          user_agent: string | null
          device_type: string
          device_vendor: string | null
          device_model: string | null
          os_name: string | null
          os_version: string | null
          browser_name: string | null
          browser_version: string | null
          access_level: string | null
          status: string
          failure_reason: string | null
          session_fingerprint: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          occurred_at?: string
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string
          device_vendor?: string | null
          device_model?: string | null
          os_name?: string | null
          os_version?: string | null
          browser_name?: string | null
          browser_version?: string | null
          access_level?: string | null
          status?: string
          failure_reason?: string | null
          session_fingerprint?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          occurred_at?: string
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string
          device_vendor?: string | null
          device_model?: string | null
          os_name?: string | null
          os_version?: string | null
          browser_name?: string | null
          browser_version?: string | null
          access_level?: string | null
          status?: string
          failure_reason?: string | null
          session_fingerprint?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      inventory_config: {
        Row: {
          id: string
          settings: Json
        }
        Insert: {
          id: string
          settings: Json
        }
        Update: {
          id?: string
          settings?: Json
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: string
          name: string | null
          order_point: number | null
          order_qty: number | null
          sort_order: number | null
          source: string | null
          stock: number | null
          target_stock: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          order_point?: number | null
          order_qty?: number | null
          sort_order?: number | null
          source?: string | null
          stock?: number | null
          target_stock?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          order_point?: number | null
          order_qty?: number | null
          sort_order?: number | null
          source?: string | null
          stock?: number | null
          target_stock?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          balance_after: number
          created_at: string
          id: string
          inventory_item_id: string | null
          note: string | null
          quantity: number
          type: string | null
        }
        Insert: {
          balance_after: number
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          note?: string | null
          quantity: number
          type?: string | null
        }
        Update: {
          balance_after?: number
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          note?: string | null
          quantity?: number
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_ai_generated: boolean | null
          product_name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          product_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          product_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          dashboard_order: number | null
          display_order: number | null
          full_name: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          schedule_order: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          dashboard_order?: number | null
          display_order?: number | null
          full_name: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          schedule_order?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          dashboard_order?: number | null
          display_order?: number | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          schedule_order?: number | null
        }
        Relationships: []
      }
      regular_holidays: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regular_holidays_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_records: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_method: string | null
          product_name: string | null
          quantity: number | null
          sale_date: string | null
          total_amount: number | null
          unit_price: number | null
          upload_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          product_name?: string | null
          quantity?: number | null
          sale_date?: string | null
          total_amount?: number | null
          unit_price?: number | null
          upload_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          product_name?: string | null
          quantity?: number | null
          sale_date?: string | null
          total_amount?: number | null
          unit_price?: number | null
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "sales_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_uploads: {
        Row: {
          analysis_summary: string | null
          created_at: string | null
          file_name: string
          id: string
          status: string | null
          total_records: number | null
          upload_date: string | null
        }
        Insert: {
          analysis_summary?: string | null
          created_at?: string | null
          file_name: string
          id?: string
          status?: string | null
          total_records?: number | null
          upload_date?: string | null
        }
        Update: {
          analysis_summary?: string | null
          created_at?: string | null
          file_name?: string
          id?: string
          status?: string | null
          total_records?: number | null
          upload_date?: string | null
        }
        Relationships: []
      }
      service_records: {
        Row: {
          completion_date: string | null
          cost: number
          created_at: string | null
          detected_problem: string | null
          equipment: string | null
          id: string
          notes: string | null
          person_in_charge: string | null
          recommended_frequency: string | null
          start_date: string | null
          status: string | null
          task_type: string | null
          work_details: string | null
        }
        Insert: {
          completion_date?: string | null
          cost?: number
          created_at?: string | null
          detected_problem?: string | null
          equipment?: string | null
          id?: string
          notes?: string | null
          person_in_charge?: string | null
          recommended_frequency?: string | null
          start_date?: string | null
          status?: string | null
          task_type?: string | null
          work_details?: string | null
        }
        Update: {
          completion_date?: string | null
          cost?: number
          created_at?: string | null
          detected_problem?: string | null
          equipment?: string | null
          id?: string
          notes?: string | null
          person_in_charge?: string | null
          recommended_frequency?: string | null
          start_date?: string | null
          status?: string | null
          task_type?: string | null
          work_details?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string | null
          employee_id: string | null
          end_time: string
          id: string
          metadata: Json | null
          start_time: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          end_time: string
          id?: string
          metadata?: Json | null
          start_time: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          end_time?: string
          id?: string
          metadata?: Json | null
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_inventory_summary: {
        Row: {
          name: string | null
          order_point: number | null
          order_qty: number | null
          source: string | null
          stock: number | null
          stock_status: string | null
          target_stock: number | null
          unit: string | null
        }
        Insert: {
          name?: string | null
          order_point?: number | null
          order_qty?: number | null
          source?: string | null
          stock?: number | null
          stock_status?: never
          target_stock?: number | null
          unit?: string | null
        }
        Update: {
          name?: string | null
          order_point?: number | null
          order_qty?: number | null
          source?: string | null
          stock?: number | null
          stock_status?: never
          target_stock?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      ai_purchase_orders_needed: {
        Row: {
          current_stock: number | null
          name: string | null
          qty_to_order: number | null
          source: string | null
          target_stock: number | null
          unit: string | null
        }
        Insert: {
          current_stock?: number | null
          name?: string | null
          qty_to_order?: never
          source?: string | null
          target_stock?: number | null
          unit?: string | null
        }
        Update: {
          current_stock?: number | null
          name?: string | null
          qty_to_order?: never
          source?: string | null
          target_stock?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      ai_recent_transactions: {
        Row: {
          balance_after: number | null
          created_at_local: string | null
          item_name: string | null
          note: string | null
          quantity: number | null
          type: string | null
        }
        Relationships: []
      }
      view_inventory_summary: {
        Row: {
          name: string | null
          order_point: number | null
          status: string | null
          stock: number | null
          target_stock: number | null
          unit: string | null
        }
        Insert: {
          name?: string | null
          order_point?: number | null
          status?: never
          stock?: number | null
          target_stock?: number | null
          unit?: string | null
        }
        Update: {
          name?: string | null
          order_point?: number | null
          status?: never
          stock?: number | null
          target_stock?: number | null
          unit?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_ai_inventory_item_details: {
        Args: { item_id: string }
        Returns: Json
      }
      get_ai_store_status: { Args: never; Returns: Json }
      get_inventory_summary: {
        Args: never
        Returns: {
          name: string
          order_point: number
          stock: number
          stock_status: string
          target_stock: number
          unit: string
        }[]
      }
      get_low_stock_items: {
        Args: never
        Returns: {
          current_stock: number
          name: string
          qty_to_order: number
          source: string
          unit: string
        }[]
      }
      get_today_schedule: {
        Args: never
        Returns: {
          end_time_local: string
          full_name: string
          start_time_local: string
          status: string
        }[]
      }
      record_inventory_transaction: {
        Args: {
          p_note: string
          p_product_id: string
          p_quantity: number
          p_type: string
        }
        Returns: Json
      }
      set_inventory_stock: {
        Args: {
          p_item_id: string
          p_new_stock: number
          p_note?: string
          p_record_history?: boolean
        }
        Returns: Json
      }
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
