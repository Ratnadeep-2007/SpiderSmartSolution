export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          hashed_password: string
          role: 'SYSTEM_ADMIN' | 'RECORDS_MANAGER' | 'KNOWLEDGE_WORKER' | 'AUDITOR' | 'EXTERNAL_GUEST'
          is_active: boolean
          created_at: string
          last_login: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          email: string
          hashed_password: string
          role: string
          is_active?: boolean
          created_at?: string
          last_login?: string | null
          expires_at?: string | null
        }
        Update: {
          email?: string
          hashed_password?: string
          role?: string
          is_active?: boolean
          last_login?: string | null
          expires_at?: string | null
        }
      }
      inventory_records: {
        Row: {
          id: string
          record_type_id: string | null
          entity: string
          entity_code: number
          department: string
          location: string
          box_barcode: string
          file_barcode: string
          description: string
          year: number
          version: number
          disposition_status: 'ACTIVE' | 'DUE' | 'DISPOSED' | 'LEGAL_HOLD'
          legal_hold: boolean
          is_active: boolean
          custom_fields: Json
          tags: string[]
          category_id: string | null
          retention_policy_id: string | null
          retention_due_date: string | null
          created_by: string | null
          created_at: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          record_type_id?: string | null
          entity: string
          entity_code: number
          department: string
          location: string
          box_barcode: string
          file_barcode: string
          description: string
          year: number
          version?: number
          disposition_status?: string
          legal_hold?: boolean
          is_active?: boolean
          custom_fields?: Json
          tags?: string[]
          category_id?: string | null
          retention_policy_id?: string | null
          retention_due_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_by?: string | null
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          record_id: string | null
          action: string
          performed_by: string | null
          performed_at: string
          ip_address: string | null
          changes: Json
          tamper_hash: string
        }
      }
      tags: {
        Row: {
          slug: string
          label: string
          color: string | null
          description: string | null
          created_at: string
        }
      }
    }
  }
}
