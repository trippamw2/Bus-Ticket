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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          auth_user_id: string
          created_at: string
          display_name: string
          email: string
          id: string
          is_active: boolean
          permissions: Json
          role_id: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          display_name?: string
          email: string
          id?: string
          is_active?: boolean
          permissions?: Json
          role_id?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean
          permissions?: Json
          role_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amount: number
          created_at: string
          id: string
          operator_phone: string | null
          phone: string
          seat_number: number | null
          status: string
          ticket_code: string
          ticket_type: string
          trip_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          operator_phone?: string | null
          phone: string
          seat_number?: number | null
          status?: string
          ticket_code: string
          ticket_type?: string
          trip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          operator_phone?: string | null
          phone?: string
          seat_number?: number | null
          status?: string
          ticket_code?: string
          ticket_type?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          capacity: number
          created_at: string
          id: string
          operator_id: string
          plate_number: string
          status: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          operator_id: string
          plate_number: string
          status?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          operator_id?: string
          plate_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "buses_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          commission_percent: number | null
          company_address: string | null
          company_name: string | null
          company_reg_number: string | null
          contact_email: string | null
          contact_person: string | null
          created_at: string
          id: string
          name: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          commission_percent?: number | null
          company_address?: string | null
          company_name?: string | null
          company_reg_number?: string | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          id?: string
          name: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number | null
          company_address?: string | null
          company_name?: string | null
          company_reg_number?: string | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          status: string
          transaction_reference: string
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          id?: string
          status?: string
          transaction_reference: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          status?: string
          transaction_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          cancellation_fee: number
          change_fee: number
          created_at: string
          default_commission: number
          id: string
          updated_at: string
        }
        Insert: {
          cancellation_fee?: number
          change_fee?: number
          created_at?: string
          default_commission?: number
          id?: string
          updated_at?: string
        }
        Update: {
          cancellation_fee?: number
          change_fee?: number
          created_at?: string
          default_commission?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          created_at: string
          destination: string
          id: string
          one_way_price: number
          operator_id: string
          origin: string
          return_price: number
          status: string
        }
        Insert: {
          created_at?: string
          destination: string
          id?: string
          one_way_price?: number
          operator_id: string
          origin: string
          return_price?: number
          status?: string
        }
        Update: {
          created_at?: string
          destination?: string
          id?: string
          one_way_price?: number
          operator_id?: string
          origin?: string
          return_price?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_locks: {
        Row: {
          booking_id: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          released: boolean
          trip_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          released?: boolean
          trip_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          released?: boolean
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_locks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_locks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          message: string
          phone: string
          provider_response: Json | null
          sms_type: string
          status: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message: string
          phone: string
          provider_response?: Json | null
          sms_type?: string
          status?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message?: string
          phone?: string
          provider_response?: Json | null
          sms_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          available_seats: number
          bus_id: string
          created_at: string
          departure_time: string | null
          id: string
          operator_id: string | null
          route_id: string
          status: string
          total_seats: number
          travel_date: string
        }
        Insert: {
          available_seats: number
          bus_id: string
          created_at?: string
          departure_time?: string | null
          id?: string
          operator_id?: string | null
          route_id: string
          status?: string
          total_seats: number
          travel_date: string
        }
        Update: {
          available_seats?: number
          bus_id?: string
          created_at?: string
          departure_time?: string | null
          id?: string
          operator_id?: string | null
          route_id?: string
          status?: string
          total_seats?: number
          travel_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      ussd_sessions: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          phone: string
          session_id: string
          step: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          phone: string
          session_id: string
          step?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          phone?: string
          session_id?: string
          step?: string
          updated_at?: string
        }
      }
      // ==================== ENTERPRISE TABLES ====================
      operator_users: {
        Row: {
          id: string
          operator_id: string
          auth_user_id: string | null
          email: string
          full_name: string
          phone: string | null
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          operator_id: string
          auth_user_id?: string | null
          email: string
          full_name: string
          phone?: string | null
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          operator_id?: string
          auth_user_id?: string | null
          email?: string
          full_name?: string
          phone?: string | null
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "operator_users_operator_id_fkey", columns: ["operator_id"], isOneToOne: false, referencedRelation: "operators", referencedColumns: ["id"] }
        ]
      }
      drivers: {
        Row: {
          id: string
          operator_id: string
          full_name: string
          phone: string
          license_number: string | null
          license_expiry: string | null
          phone_number: string | null
          emergency_contact: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          operator_id: string
          full_name: string
          phone: string
          license_number?: string | null
          license_expiry?: string | null
          phone_number?: string | null
          emergency_contact?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          operator_id?: string
          full_name?: string
          phone?: string
          license_number?: string | null
          license_expiry?: string | null
          phone_number?: string | null
          emergency_contact?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "drivers_operator_id_fkey", columns: ["operator_id"], isOneToOne: false, referencedRelation: "operators", referencedColumns: ["id"] }
        ]
      }
      bus_documents: {
        Row: {
          id: string
          bus_id: string
          document_type: string
          document_number: string | null
          issue_date: string | null
          expiry_date: string | null
          file_url: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bus_id: string
          document_type: string
          document_number?: string | null
          issue_date?: string | null
          expiry_date?: string | null
          file_url?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bus_id?: string
          document_type?: string
          document_number?: string | null
          issue_date?: string | null
          expiry_date?: string | null
          file_url?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "bus_documents_bus_id_fkey", columns: ["bus_id"], isOneToOne: false, referencedRelation: "buses", referencedColumns: ["id"] }
        ]
      }
      maintenance_logs: {
        Row: {
          id: string
          bus_id: string
          maintenance_type: string
          description: string | null
          cost: number | null
          performed_by: string | null
          performed_date: string | null
          next_due_date: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bus_id: string
          maintenance_type: string
          description?: string | null
          cost?: number | null
          performed_by?: string | null
          performed_date?: string | null
          next_due_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bus_id?: string
          maintenance_type?: string
          description?: string | null
          cost?: number | null
          performed_by?: string | null
          performed_date?: string | null
          next_due_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "maintenance_logs_bus_id_fkey", columns: ["bus_id"], isOneToOne: false, referencedRelation: "buses", referencedColumns: ["id"] }
        ]
      }
      seasonal_pricing: {
        Row: {
          id: string
          route_id: string
          season_name: string
          start_date: string
          end_date: string
          price_modifier: number
          is_percentage: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          route_id: string
          season_name: string
          start_date: string
          end_date: string
          price_modifier: number
          is_percentage?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          season_name?: string
          start_date?: string
          end_date?: string
          price_modifier?: number
          is_percentage?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "seasonal_pricing_route_id_fkey", columns: ["route_id"], isOneToOne: false, referencedRelation: "routes", referencedColumns: ["id"] }
        ]
      }
      route_price_history: {
        Row: {
          id: string
          route_id: string
          old_price: number | null
          new_price: number | null
          price_type: string
          changed_by: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          route_id: string
          old_price?: number | null
          new_price?: number | null
          price_type: string
          changed_by?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          old_price?: number | null
          new_price?: number | null
          price_type?: string
          changed_by?: string | null
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "route_price_history_route_id_fkey", columns: ["route_id"], isOneToOne: false, referencedRelation: "routes", referencedColumns: ["id"] }
        ]
      }
      trip_price_overrides: {
        Row: {
          id: string
          trip_id: string
          original_price: number | null
          override_price: number | null
          reason: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          original_price?: number | null
          override_price?: number | null
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          original_price?: number | null
          override_price?: number | null
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "trip_price_overrides_trip_id_fkey", columns: ["trip_id"], isOneToOne: false, referencedRelation: "trips", referencedColumns: ["id"] }
        ]
      }
      settlements: {
        Row: {
          id: string
          operator_id: string
          settlement_period_start: string
          settlement_period_end: string
          gross_amount: number
          commission_amount: number
          airtel_fee: number
          vat_amount: number
          net_amount: number
          status: string
          paid_at: string | null
          payment_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          operator_id: string
          settlement_period_start: string
          settlement_period_end: string
          gross_amount: number
          commission_amount: number
          airtel_fee: number
          vat_amount: number
          net_amount: number
          status?: string
          paid_at?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          operator_id?: string
          settlement_period_start?: string
          settlement_period_end?: string
          gross_amount?: number
          commission_amount?: number
          airtel_fee?: number
          vat_amount?: number
          net_amount?: number
          status?: string
          paid_at?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "settlements_operator_id_fkey", columns: ["operator_id"], isOneToOne: false, referencedRelation: "operators", referencedColumns: ["id"] }
        ]
      }
      operator_wallets: {
        Row: {
          id: string
          operator_id: string
          balance: number
          held_funds: number
          cleared_funds: number
          total_earned: number
          total_paid: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          operator_id: string
          balance?: number
          held_funds?: number
          cleared_funds?: number
          total_earned?: number
          total_paid?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          operator_id?: string
          balance?: number
          held_funds?: number
          cleared_funds?: number
          total_earned?: number
          total_paid?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "operator_wallets_operator_id_fkey", columns: ["operator_id"], isOneToOne: false, referencedRelation: "operators", referencedColumns: ["id"] }
        ]
      }
      wallet_transactions: {
        Row: {
          id: string
          wallet_id: string
          type: string
          amount: number
          reference_type: string | null
          reference_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          wallet_id: string
          type: string
          amount: number
          reference_type?: string | null
          reference_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          wallet_id?: string
          type?: string
          amount?: number
          reference_type?: string | null
          reference_id?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "wallet_transactions_wallet_id_fkey", columns: ["wallet_id"], isOneToOne: false, referencedRelation: "operator_wallets", referencedColumns: ["id"] }
        ]
      }
      trip_delays: {
        Row: {
          id: string
          trip_id: string
          original_departure_time: string | null
          new_departure_time: string | null
          reason: string | null
          reported_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          original_departure_time?: string | null
          new_departure_time?: string | null
          reason?: string | null
          reported_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          original_departure_time?: string | null
          new_departure_time?: string | null
          reason?: string | null
          reported_by?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "trip_delays_trip_id_fkey", columns: ["trip_id"], isOneToOne: false, referencedRelation: "trips", referencedColumns: ["id"] }
        ]
      }
      operator_audit_logs: {
        Row: {
          id: string
          operator_id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          operator_id: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          operator_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "operator_audit_logs_operator_id_fkey", columns: ["operator_id"], isOneToOne: false, referencedRelation: "operators", referencedColumns: ["id"] },
          { foreignKeyName: "operator_audit_logs_user_id_fkey", columns: ["user_id"], isOneToOne: false, referencedRelation: "operator_users", referencedColumns: ["id"] }
        ]
      }
      route_analytics: {
        Row: {
          id: string
          route_id: string
          period_start: string
          period_end: string
          total_bookings: number
          total_revenue: number
          total_seats_available: number
          seats_sold: number
          load_factor: number | null
          cancellation_count: number
          avg_ticket_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          route_id: string
          period_start: string
          period_end: string
          total_bookings?: number
          total_revenue?: number
          total_seats_available?: number
          seats_sold?: number
          load_factor?: number | null
          cancellation_count?: number
          avg_ticket_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          period_start?: string
          period_end?: string
          total_bookings?: number
          total_revenue?: number
          total_seats_available?: number
          seats_sold?: number
          load_factor?: number | null
          cancellation_count?: number
          avg_ticket_price?: number | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "route_analytics_route_id_fkey", columns: ["route_id"], isOneToOne: false, referencedRelation: "routes", referencedColumns: ["id"] }
        ]
      }
    }
    Views: {
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_ussd_sessions: { Args: never; Returns: undefined }
      confirm_booking: { Args: { p_booking_id: string }; Returns: Json }
      expire_stale_locks: { Args: never; Returns: undefined }
      fail_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: Json
      }
    }
    Enums: {
      operator_role: 'owner' | 'manager' | 'operations' | 'finance' | 'agent'
      bus_document_type: 'insurance' | 'road_permit' | 'fitness_certificate' | 'registration' | 'other'
      maintenance_type: 'routine' | 'repair' | 'inspection' | 'tire_replacement' | 'engine_service' | 'brake_service' | 'other'
      settlement_status: 'pending' | 'processing' | 'paid' | 'frozen' | 'disputed'
    }
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
    Enums: {
      operator_role: ['owner', 'manager', 'operations', 'finance', 'agent'] as const,
      bus_document_type: ['insurance', 'road_permit', 'fitness_certificate', 'registration', 'other'] as const,
      maintenance_type: ['routine', 'repair', 'inspection', 'tire_replacement', 'engine_service', 'brake_service', 'other'] as const,
      settlement_status: ['pending', 'processing', 'paid', 'frozen', 'disputed'] as const,
    },
  },
} as const
  public: {
    Enums: {},
  },
} as const
