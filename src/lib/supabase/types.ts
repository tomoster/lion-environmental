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
      invoices: {
        Row: {
          building_address: string | null
          client_company: string | null
          created_at: string | null
          date_paid: string | null
          date_sent: string | null
          due_date: string | null
          id: string
          invoice_number: number
          job_id: string | null
          notes: string | null
          pdf_path: string | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          building_address?: string | null
          client_company?: string | null
          created_at?: string | null
          date_paid?: string | null
          date_sent?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: number
          job_id?: string | null
          notes?: string | null
          pdf_path?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          building_address?: string | null
          client_company?: string | null
          created_at?: string | null
          date_paid?: string | null
          date_sent?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: number
          job_id?: string | null
          notes?: string | null
          pdf_path?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          building_address: string | null
          client_company: string | null
          client_email: string | null
          created_at: string | null
          dispatch_status: string
          id: string
          job_number: number
          notes: string | null
          num_common_spaces: number | null
          num_units: number | null
          num_wipes: number | null
          price_per_common_space: number | null
          price_per_unit: number | null
          prospect_id: string | null
          report_file_path: string | null
          report_status: string
          scan_date: string | null
          service_type: string | null
          updated_at: string | null
          worker_id: string | null
        }
        Insert: {
          building_address?: string | null
          client_company?: string | null
          client_email?: string | null
          created_at?: string | null
          dispatch_status?: string
          id?: string
          job_number?: number
          notes?: string | null
          num_common_spaces?: number | null
          num_units?: number | null
          num_wipes?: number | null
          price_per_common_space?: number | null
          price_per_unit?: number | null
          prospect_id?: string | null
          report_file_path?: string | null
          report_status?: string
          scan_date?: string | null
          service_type?: string | null
          updated_at?: string | null
          worker_id?: string | null
        }
        Update: {
          building_address?: string | null
          client_company?: string | null
          client_email?: string | null
          created_at?: string | null
          dispatch_status?: string
          id?: string
          job_number?: number
          notes?: string | null
          num_common_spaces?: number | null
          num_units?: number | null
          num_wipes?: number | null
          price_per_common_space?: number | null
          price_per_unit?: number | null
          prospect_id?: string | null
          report_file_path?: string | null
          report_status?: string
          scan_date?: string | null
          service_type?: string | null
          updated_at?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          building_address: string | null
          company: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          next_followup: string | null
          notes: string | null
          phone: string | null
          service_interest: string | null
          source: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          building_address?: string | null
          company: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          service_interest?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          building_address?: string | null
          company?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          service_interest?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      worker_payments: {
        Row: {
          amount: number
          confirmation_number: string | null
          created_at: string | null
          id: string
          job_id: string | null
          notes: string | null
          payment_date: string
          worker_id: string | null
        }
        Insert: {
          amount: number
          confirmation_number?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          payment_date: string
          worker_id?: string | null
        }
        Update: {
          amount?: number
          confirmation_number?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          payment_date?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          rate: number | null
          specialization: string | null
          telegram_chat_id: string | null
          zelle: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          rate?: number | null
          specialization?: string | null
          telegram_chat_id?: string | null
          zelle?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          rate?: number | null
          specialization?: string | null
          telegram_chat_id?: string | null
          zelle?: string | null
        }
        Relationships: []
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
