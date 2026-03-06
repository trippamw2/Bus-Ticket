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
      booking_events: {
        Row: {
          booking_id: string | null
          created_at: string | null
          event_description: string | null
          event_type: string | null
          id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          event_description?: string | null
          event_type?: string | null
          id?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          event_description?: string | null
          event_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      bus_capacity_config: {
        Row: {
          bus_id: string | null
          id: string
          standing_allowed: boolean | null
          total_seats: number | null
          updated_at: string | null
        }
        Insert: {
          bus_id?: string | null
          id?: string
          standing_allowed?: boolean | null
          total_seats?: number | null
          updated_at?: string | null
        }
        Update: {
          bus_id?: string | null
          id?: string
          standing_allowed?: boolean | null
          total_seats?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_capacity_config_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_documents: {
        Row: {
          bus_id: string | null
          created_at: string | null
          document_number: string | null
          document_type: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          notes: string | null
          operator_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bus_id?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          operator_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bus_id?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          operator_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_documents_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
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
      commission_rules: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          id: string
          operator_id: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          operator_id?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          operator_id?: string | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          hire_date: string | null
          id: string
          license_class: string | null
          license_expiry: string | null
          license_number: string | null
          national_id: string | null
          notes: string | null
          operator_id: string | null
          phone: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          license_class?: string | null
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          notes?: string | null
          operator_id?: string | null
          phone: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          license_class?: string | null
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          notes?: string | null
          operator_id?: string | null
          phone?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_ledger: {
        Row: {
          account_type: string
          balance_after: number | null
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          account_type: string
          balance_after?: number | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          account_type?: string
          balance_after?: number | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          id: string
          passenger_phone: string | null
          points: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          passenger_phone?: string | null
          points?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          passenger_phone?: string | null
          points?: number | null
        }
        Relationships: []
      }
      maintenance_logs: {
        Row: {
          bus_id: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          invoice_number: string | null
          maintenance_type: string | null
          next_due_date: string | null
          notes: string | null
          odometer_reading: number | null
          operator_id: string
          performed_by: string | null
          performed_date: string | null
          status: string | null
          updated_at: string | null
          vendor_contact: string | null
          vendor_name: string | null
        }
        Insert: {
          bus_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_number?: string | null
          maintenance_type?: string | null
          next_due_date?: string | null
          notes?: string | null
          odometer_reading?: number | null
          operator_id: string
          performed_by?: string | null
          performed_date?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Update: {
          bus_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_number?: string | null
          maintenance_type?: string | null
          next_due_date?: string | null
          notes?: string | null
          odometer_reading?: number | null
          operator_id?: string
          performed_by?: string | null
          performed_date?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          operator_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          operator_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          operator_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_audit_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "operator_users"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_revenue_reports: {
        Row: {
          commission_amount: number | null
          created_at: string | null
          gross_amount: number | null
          id: string
          net_amount: number | null
          operator_id: string | null
          report_date: string | null
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          operator_id?: string | null
          report_date?: string | null
        }
        Update: {
          commission_amount?: number | null
          created_at?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          operator_id?: string | null
          report_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_revenue_reports_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_settlements: {
        Row: {
          created_at: string | null
          gross_amount: number | null
          id: string
          net_amount: number | null
          operator_id: string | null
          platform_commission: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          operator_id?: string | null
          platform_commission?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          operator_id?: string | null
          platform_commission?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_settlements_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          operator_id: string
          permissions: Json | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          operator_id: string
          permissions?: Json | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          operator_id?: string
          permissions?: Json | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_users_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_wallets: {
        Row: {
          balance: number | null
          cleared_funds: number | null
          created_at: string | null
          currency: string | null
          held_funds: number | null
          id: string
          operator_id: string
          total_earned: number | null
          total_paid: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          cleared_funds?: number | null
          created_at?: string | null
          currency?: string | null
          held_funds?: number | null
          id?: string
          operator_id: string
          total_earned?: number | null
          total_paid?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          cleared_funds?: number | null
          created_at?: string | null
          currency?: string | null
          held_funds?: number | null
          id?: string
          operator_id?: string
          total_earned?: number | null
          total_paid?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_wallets_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: true
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          airtel_fee_percent: number | null
          airtel_fixed_fee: number | null
          commission_percent: number | null
          commission_rate: number | null
          company_address: string | null
          company_name: string | null
          company_reg_number: string | null
          contact_email: string | null
          contact_person: string | null
          created_at: string
          id: string
          is_enterprise: boolean | null
          name: string
          phone: string
          settlement_hours: number | null
          status: string
          updated_at: string
          wallet_enabled: boolean | null
        }
        Insert: {
          airtel_fee_percent?: number | null
          airtel_fixed_fee?: number | null
          commission_percent?: number | null
          commission_rate?: number | null
          company_address?: string | null
          company_name?: string | null
          company_reg_number?: string | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          id?: string
          is_enterprise?: boolean | null
          name: string
          phone: string
          settlement_hours?: number | null
          status?: string
          updated_at?: string
          wallet_enabled?: boolean | null
        }
        Update: {
          airtel_fee_percent?: number | null
          airtel_fixed_fee?: number | null
          commission_percent?: number | null
          commission_rate?: number | null
          company_address?: string | null
          company_name?: string | null
          company_reg_number?: string | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          id?: string
          is_enterprise?: boolean | null
          name?: string
          phone?: string
          settlement_hours?: number | null
          status?: string
          updated_at?: string
          wallet_enabled?: boolean | null
        }
        Relationships: []
      }
      passengers: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
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
      refund_requests: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          reason: string | null
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      route_analytics: {
        Row: {
          avg_ticket_price: number | null
          cancellation_count: number | null
          created_at: string | null
          id: string
          load_factor: number | null
          period_end: string
          period_start: string
          route_id: string
          seats_sold: number | null
          total_bookings: number | null
          total_revenue: number | null
          total_seats_available: number | null
        }
        Insert: {
          avg_ticket_price?: number | null
          cancellation_count?: number | null
          created_at?: string | null
          id?: string
          load_factor?: number | null
          period_end: string
          period_start: string
          route_id: string
          seats_sold?: number | null
          total_bookings?: number | null
          total_revenue?: number | null
          total_seats_available?: number | null
        }
        Update: {
          avg_ticket_price?: number | null
          cancellation_count?: number | null
          created_at?: string | null
          id?: string
          load_factor?: number | null
          period_end?: string
          period_start?: string
          route_id?: string
          seats_sold?: number | null
          total_bookings?: number | null
          total_revenue?: number | null
          total_seats_available?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_analytics_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_demand_metrics: {
        Row: {
          bookings_count: number | null
          created_at: string | null
          id: string
          revenue_generated: number | null
          route_id: string | null
          travel_date: string | null
        }
        Insert: {
          bookings_count?: number | null
          created_at?: string | null
          id?: string
          revenue_generated?: number | null
          route_id?: string | null
          travel_date?: string | null
        }
        Update: {
          bookings_count?: number | null
          created_at?: string | null
          id?: string
          revenue_generated?: number | null
          route_id?: string | null
          travel_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_demand_metrics_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_price_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_price: number | null
          notes: string | null
          old_price: number | null
          operator_id: string
          price_type: string | null
          reason: string | null
          route_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_price?: number | null
          notes?: string | null
          old_price?: number | null
          operator_id: string
          price_type?: string | null
          reason?: string | null
          route_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_price?: number | null
          notes?: string | null
          old_price?: number | null
          operator_id?: string
          price_type?: string | null
          reason?: string | null
          route_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_price_history_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
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
      seasonal_pricing: {
        Row: {
          apply_to: string | null
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_percentage: boolean | null
          notes: string | null
          operator_id: string
          price_modifier: number | null
          route_id: string | null
          season_name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          apply_to?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          notes?: string | null
          operator_id: string
          price_modifier?: number | null
          route_id?: string | null
          season_name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          apply_to?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          notes?: string | null
          operator_id?: string
          price_modifier?: number | null
          route_id?: string | null
          season_name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_pricing_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
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
      security_alerts: {
        Row: {
          alert_type: string | null
          created_at: string | null
          description: string | null
          id: string
          resolved: boolean | null
          severity: string | null
        }
        Insert: {
          alert_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          resolved?: boolean | null
          severity?: string | null
        }
        Update: {
          alert_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          resolved?: boolean | null
          severity?: string | null
        }
        Relationships: []
      }
      settlements: {
        Row: {
          airtel_fee: number | null
          commission_amount: number | null
          created_at: string | null
          gross_amount: number | null
          id: string
          net_amount: number | null
          notes: string | null
          operator_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          settlement_period_end: string
          settlement_period_start: string
          status: string | null
          updated_at: string | null
          vat_amount: number | null
        }
        Insert: {
          airtel_fee?: number | null
          commission_amount?: number | null
          created_at?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          operator_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          settlement_period_end: string
          settlement_period_start: string
          status?: string | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Update: {
          airtel_fee?: number | null
          commission_amount?: number | null
          created_at?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          operator_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          settlement_period_end?: string
          settlement_period_start?: string
          status?: string | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
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
      tickets: {
        Row: {
          booking_id: string | null
          id: string
          issued_at: string | null
          sms_sent: boolean | null
          ticket_reference: string | null
        }
        Insert: {
          booking_id?: string | null
          id?: string
          issued_at?: string | null
          sms_sent?: boolean | null
          ticket_reference?: string | null
        }
        Update: {
          booking_id?: string | null
          id?: string
          issued_at?: string | null
          sms_sent?: boolean | null
          ticket_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          driver_id: string | null
          id: string
          notes: string | null
          operator_id: string
          status: string | null
          trip_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          operator_id: string
          status?: string | null
          trip_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          operator_id?: string
          status?: string | null
          trip_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_assignments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_delays: {
        Row: {
          created_at: string | null
          id: string
          new_departure_time: string | null
          original_departure_time: string | null
          reason: string | null
          reported_by: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_departure_time?: string | null
          original_departure_time?: string | null
          reason?: string | null
          reported_by?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          new_departure_time?: string | null
          original_departure_time?: string | null
          reason?: string | null
          reported_by?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_delays_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
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
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string
          operator_id: string
          reference_id: string | null
          reference_type: string | null
          status: string | null
          type: string | null
          wallet_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          operator_id: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          operator_id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "operator_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_withdrawal_requests: {
        Row: {
          amount: number
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          created_at: string | null
          currency: string | null
          failure_reason: string | null
          id: string
          payment_method: string | null
          phone_number: string | null
          processed_at: string | null
          provider: string | null
          provider_reference: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          id?: string
          payment_method?: string | null
          phone_number?: string | null
          processed_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          id?: string
          payment_method?: string | null
          phone_number?: string | null
          processed_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_withdrawal_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "operator_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_settle_operator: { Args: { p_trip_id: string }; Returns: undefined }
      cleanup_ussd_sessions: { Args: never; Returns: undefined }
      confirm_booking: { Args: { p_booking_id: string }; Returns: Json }
      expire_stale_locks: { Args: never; Returns: undefined }
      fail_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: Json
      }
      generate_sms_ticket: {
        Args: { p_booking_id: string; p_phone: string }
        Returns: string
      }
      get_effective_route_price: {
        Args: { p_route_id: string; p_ticket_type?: string }
        Returns: number
      }
      handle_ussd: {
        Args: { p_phone: string; p_session_id: string; p_text: string }
        Returns: string
      }
      post_ledger_entry: {
        Args: {
          p_account: string
          p_credit: number
          p_debit: number
          p_desc: string
          p_ref_id: string
          p_ref_type: string
        }
        Returns: undefined
      }
      release_expired_seat_locks: { Args: never; Returns: undefined }
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
