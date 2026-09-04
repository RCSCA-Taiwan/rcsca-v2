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
      activities: {
        Row: {
          category: string
          code: string
          created_at: string
          ends_at: string | null
          id: string
          name: string
          public_summary: string | null
          starts_at: string | null
          status: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          name: string
          public_summary?: string | null
          starts_at?: string | null
          status?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string
          public_summary?: string | null
          starts_at?: string | null
          status?: string
        }
        Relationships: []
      }
      activity_participations: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          participation_type: string
          source_channel: string | null
          status: Database["public"]["Enums"]["verification_status"]
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          participation_type: string
          source_channel?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          participation_type?: string
          source_channel?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_participations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_participations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          created_at: string
          id: string
          role_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          id: number
          note: string | null
          subject_id: string | null
          subject_type: string
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          subject_id?: string | null
          subject_type: string
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          subject_id?: string | null
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      case_needs: {
        Row: {
          case_id: string
          category: string
          created_at: string
          description: string
          id: string
          status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          case_id: string
          category: string
          created_at?: string
          description: string
          id?: string
          status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          case_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "case_needs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_stories: {
        Row: {
          anonymized: boolean
          consent_confirmed: boolean
          created_at: string
          created_by: string | null
          id: string
          public_source_label: string | null
          public_source_note: string | null
          published_at: string | null
          role_flow: string[]
          source_id: string | null
          source_type: string
          status: Database["public"]["Enums"]["review_status"]
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          anonymized?: boolean
          consent_confirmed?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          public_source_label?: string | null
          public_source_note?: string | null
          published_at?: string | null
          role_flow?: string[]
          source_id?: string | null
          source_type: string
          status?: Database["public"]["Enums"]["review_status"]
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          anonymized?: boolean
          consent_confirmed?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          public_source_label?: string | null
          public_source_note?: string | null
          published_at?: string | null
          role_flow?: string[]
          source_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["review_status"]
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      enterprise_applications: {
        Row: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          direction: string | null
          enterprise_id: string | null
          id: string
          region: string | null
          requester_user_id: string
          review_note: string | null
          share_options: string[]
          status: Database["public"]["Enums"]["review_status"]
          tax_id: string
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          direction?: string | null
          enterprise_id?: string | null
          id?: string
          region?: string | null
          requester_user_id: string
          review_note?: string | null
          share_options?: string[]
          status?: Database["public"]["Enums"]["review_status"]
          tax_id: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          direction?: string | null
          enterprise_id?: string | null
          id?: string
          region?: string | null
          requester_user_id?: string
          review_note?: string | null
          share_options?: string[]
          status?: Database["public"]["Enums"]["review_status"]
          tax_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_applications_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_applications_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_applications_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_applications_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_applications_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_applications_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_applications_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      enterprise_badges: {
        Row: {
          badge_label: string
          enterprise_id: string
          expires_at: string | null
          id: string
          issued_at: string | null
          status: string
          year: number
        }
        Insert: {
          badge_label?: string
          enterprise_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          status?: string
          year: number
        }
        Update: {
          badge_label?: string
          enterprise_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_badges_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_badges_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_badges_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_badges_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_badges_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_esg_assets: {
        Row: {
          asset_type: string
          created_at: string
          created_by: string | null
          enterprise_id: string
          evidence_note: string | null
          id: string
          metric_label: string | null
          metric_unit: string | null
          metric_value: number | null
          period_label: string | null
          report_ready: boolean
          sdg_tags: string[]
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["review_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          created_by?: string | null
          enterprise_id: string
          evidence_note?: string | null
          id?: string
          metric_label?: string | null
          metric_unit?: string | null
          metric_value?: number | null
          period_label?: string | null
          report_ready?: boolean
          sdg_tags?: string[]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          created_by?: string | null
          enterprise_id?: string
          evidence_note?: string | null
          id?: string
          metric_label?: string | null
          metric_unit?: string | null
          metric_value?: number | null
          period_label?: string | null
          report_ready?: boolean
          sdg_tags?: string[]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_esg_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_service_request_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          note: string | null
          request_id: string
          status: Database["public"]["Enums"]["review_status"] | null
          visible_to_enterprise: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          note?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["review_status"] | null
          visible_to_enterprise?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          note?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["review_status"] | null
          visible_to_enterprise?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_service_request_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_service_request_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "enterprise_service_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "enterprise_case_workbench"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_service_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "enterprise_service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_service_requests: {
        Row: {
          admin_note: string | null
          assigned_at: string | null
          assigned_to: string | null
          case_number: string | null
          company_name: string
          completed_at: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          enterprise_id: string | null
          goal: string | null
          id: string
          last_due_reminder_at: string | null
          needs: string[]
          next_action: string | null
          next_action_due_at: string | null
          requester_user_id: string | null
          service_tier: string
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          case_number?: string | null
          company_name: string
          completed_at?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          enterprise_id?: string | null
          goal?: string | null
          id?: string
          last_due_reminder_at?: string | null
          needs?: string[]
          next_action?: string | null
          next_action_due_at?: string | null
          requester_user_id?: string | null
          service_tier?: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          case_number?: string | null
          company_name?: string
          completed_at?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          enterprise_id?: string | null
          goal?: string | null
          id?: string
          last_due_reminder_at?: string | null
          needs?: string[]
          next_action?: string | null
          next_action_due_at?: string | null
          requester_user_id?: string | null
          service_tier?: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "enterprise_service_requests_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_service_requests_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_service_requests_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_service_requests_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_service_requests_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_service_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_service_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      enterprise_shares: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          enterprise_id: string
          id: string
          public_result: boolean
          share_type: Database["public"]["Enums"]["share_type"]
          starts_at: string | null
          status: Database["public"]["Enums"]["review_status"]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          enterprise_id: string
          id?: string
          public_result?: boolean
          share_type: Database["public"]["Enums"]["share_type"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          enterprise_id?: string
          id?: string
          public_result?: boolean
          share_type?: Database["public"]["Enums"]["share_type"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_shares_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_shares_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_shares_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_shares_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_shares_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_users: {
        Row: {
          created_at: string
          enterprise_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enterprise_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enterprise_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_users_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_users_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_users_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_users_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_users_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      enterprises: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          industry: string | null
          legal_name: string
          public_description: string | null
          region: string | null
          status: Database["public"]["Enums"]["review_status"]
          tax_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          industry?: string | null
          legal_name: string
          public_description?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          tax_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          industry?: string | null
          legal_name?: string
          public_description?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          tax_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      identity_verifications: {
        Row: {
          created_at: string
          id: string
          identity_token_hash: string | null
          status: Database["public"]["Enums"]["verification_status"]
          user_id: string
          verification_kind: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identity_token_hash?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id: string
          verification_kind: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identity_token_hash?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id?: string
          verification_kind?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "identity_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          invitee_user_id: string | null
          inviter_user_id: string | null
          original_referrer_text: string | null
          source_note: string | null
          source_type: string | null
          status: string
          team_id: string | null
          token_hash: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_user_id?: string | null
          inviter_user_id?: string | null
          original_referrer_text?: string | null
          source_note?: string | null
          source_type?: string | null
          status?: string
          team_id?: string | null
          token_hash?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_user_id?: string | null
          inviter_user_id?: string | null
          original_referrer_text?: string | null
          source_note?: string | null
          source_type?: string | null
          status?: string
          team_id?: string | null
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      member_levels: {
        Row: {
          level: number
          lifetime_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          level?: number
          lifetime_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          level?: number
          lifetime_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_levels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_levels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          member_number: string | null
          member_since: string | null
          membership_type: Database["public"]["Enums"]["membership_type"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_number?: string | null
          member_since?: string | null
          membership_type: Database["public"]["Enums"]["membership_type"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_number?: string | null
          member_since?: string | null
          membership_type?: Database["public"]["Enums"]["membership_type"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      my_one_preferences: {
        Row: {
          created_at: string
          share_modes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          share_modes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          share_modes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "my_one_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "my_one_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      network_contact_consents: {
        Row: {
          consented: boolean
          consented_at: string | null
          created_at: string
          id: string
          response_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consented?: boolean
          consented_at?: string | null
          created_at?: string
          id?: string
          response_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consented?: boolean
          consented_at?: string | null
          created_at?: string
          id?: string
          response_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_contact_consents_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "network_match_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_contact_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_contact_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      network_contact_reveals: {
        Row: {
          counterparty_display_name: string | null
          counterparty_email: string | null
          counterparty_mobile: string | null
          counterparty_user_id: string
          created_at: string
          id: string
          response_id: string
          visible_to_user_id: string
        }
        Insert: {
          counterparty_display_name?: string | null
          counterparty_email?: string | null
          counterparty_mobile?: string | null
          counterparty_user_id: string
          created_at?: string
          id?: string
          response_id: string
          visible_to_user_id: string
        }
        Update: {
          counterparty_display_name?: string | null
          counterparty_email?: string | null
          counterparty_mobile?: string | null
          counterparty_user_id?: string
          created_at?: string
          id?: string
          response_id?: string
          visible_to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_contact_reveals_counterparty_user_id_fkey"
            columns: ["counterparty_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_contact_reveals_counterparty_user_id_fkey"
            columns: ["counterparty_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "network_contact_reveals_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "network_match_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_contact_reveals_visible_to_user_id_fkey"
            columns: ["visible_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_contact_reveals_visible_to_user_id_fkey"
            columns: ["visible_to_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      network_match_responses: {
        Row: {
          admin_note: string | null
          contact_exchange_allowed: boolean
          created_at: string
          id: string
          message: string
          request_id: string
          responder_enterprise_id: string | null
          responder_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          contact_exchange_allowed?: boolean
          created_at?: string
          id?: string
          message: string
          request_id: string
          responder_enterprise_id?: string | null
          responder_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          contact_exchange_allowed?: boolean
          created_at?: string
          id?: string
          message?: string
          request_id?: string
          responder_enterprise_id?: string | null
          responder_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_match_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "network_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_match_responses_responder_enterprise_id_fkey"
            columns: ["responder_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_match_responses_responder_enterprise_id_fkey"
            columns: ["responder_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_match_responses_responder_enterprise_id_fkey"
            columns: ["responder_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_match_responses_responder_enterprise_id_fkey"
            columns: ["responder_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_match_responses_responder_enterprise_id_fkey"
            columns: ["responder_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_match_responses_responder_user_id_fkey"
            columns: ["responder_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_match_responses_responder_user_id_fkey"
            columns: ["responder_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "network_match_responses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_match_responses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      network_profiles: {
        Row: {
          category: string
          created_at: string
          display_name: string
          enterprise_id: string | null
          id: string
          owner_type: string
          public_description: string | null
          public_visible: boolean
          region: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          display_name: string
          enterprise_id?: string | null
          id?: string
          owner_type?: string
          public_description?: string | null
          public_visible?: boolean
          region?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          display_name?: string
          enterprise_id?: string | null
          id?: string
          owner_type?: string
          public_description?: string | null
          public_visible?: boolean
          region?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_profiles_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_profiles_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_profiles_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_profiles_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_profiles_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      network_requests: {
        Row: {
          created_at: string
          id: string
          privacy: Database["public"]["Enums"]["privacy_scope"]
          private_detail: string | null
          public_summary: string | null
          request_kind: string
          requester_enterprise_id: string | null
          requester_user_id: string
          status: Database["public"]["Enums"]["review_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          privacy?: Database["public"]["Enums"]["privacy_scope"]
          private_detail?: string | null
          public_summary?: string | null
          request_kind: string
          requester_enterprise_id?: string | null
          requester_user_id: string
          status?: Database["public"]["Enums"]["review_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          privacy?: Database["public"]["Enums"]["privacy_scope"]
          private_detail?: string | null
          public_summary?: string | null
          request_kind?: string
          requester_enterprise_id?: string | null
          requester_user_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_requests_requester_enterprise_id_fkey"
            columns: ["requester_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_requests_requester_enterprise_id_fkey"
            columns: ["requester_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_requests_requester_enterprise_id_fkey"
            columns: ["requester_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_requests_requester_enterprise_id_fkey"
            columns: ["requester_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "network_requests_requester_enterprise_id_fkey"
            columns: ["requester_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      outcome_review_queue: {
        Row: {
          created_at: string
          enterprise_id: string | null
          id: string
          proposed_esg_asset: boolean
          proposed_story: boolean
          review_note: string | null
          source_id: string
          source_type: string
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enterprise_id?: string | null
          id?: string
          proposed_esg_asset?: boolean
          proposed_story?: boolean
          review_note?: string | null
          source_id: string
          source_type: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enterprise_id?: string | null
          id?: string
          proposed_esg_asset?: boolean
          proposed_story?: boolean
          review_note?: string | null
          source_id?: string
          source_type?: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_review_queue_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "outcome_review_queue_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "outcome_review_queue_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "outcome_review_queue_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "outcome_review_queue_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          points: number
          source_id: string | null
          source_type: string
          tx_type: Database["public"]["Enums"]["point_tx_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          points: number
          source_id?: string | null
          source_type: string
          tx_type: Database["public"]["Enums"]["point_tx_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          points?: number
          source_id?: string | null
          source_type?: string
          tx_type?: Database["public"]["Enums"]["point_tx_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          joined_platform_at: string
          locale: string
          mobile: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          joined_platform_at?: string
          locale?: string
          mobile?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          joined_platform_at?: string
          locale?: string
          mobile?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      record_change_requests: {
        Row: {
          created_at: string
          id: string
          proposed_changes: Json
          request_action: string
          requester_note: string | null
          requester_user_id: string
          reviewed_at: string | null
          reviewer_note: string | null
          reviewer_user_id: string | null
          status: Database["public"]["Enums"]["review_status"]
          subject_id: string
          subject_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposed_changes?: Json
          request_action: string
          requester_note?: string | null
          requester_user_id: string
          reviewed_at?: string | null
          reviewer_note?: string | null
          reviewer_user_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          subject_id: string
          subject_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          proposed_changes?: Json
          request_action?: string
          requester_note?: string | null
          requester_user_id?: string
          reviewed_at?: string | null
          reviewer_note?: string | null
          reviewer_user_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          subject_id?: string
          subject_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_change_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_change_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "record_change_requests_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_change_requests_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reward_catalog: {
        Row: {
          category: string
          created_at: string
          description: string | null
          ends_at: string | null
          enterprise_id: string | null
          id: string
          min_footprints: number
          min_level: number | null
          point_cost: number
          starts_at: string | null
          status: Database["public"]["Enums"]["review_status"]
          stock_remaining: number | null
          stock_total: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          enterprise_id?: string | null
          id?: string
          min_footprints?: number
          min_level?: number | null
          point_cost?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          stock_remaining?: number | null
          stock_total?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          enterprise_id?: string | null
          id?: string
          min_footprints?: number
          min_level?: number | null
          point_cost?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          stock_remaining?: number | null
          stock_total?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_catalog_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "reward_catalog_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "reward_catalog_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "reward_catalog_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "reward_catalog_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          point_cost: number
          redemption_code: string | null
          reward_id: string
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          point_cost: number
          redemption_code?: string | null
          reward_id: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          point_cost?: number
          redemption_code?: string | null
          reward_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "reward_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sharing_footprints: {
        Row: {
          created_at: string
          description: string | null
          footprint_type: string
          id: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          footprint_type: string
          id?: string
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          footprint_type?: string
          id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sharing_footprints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sharing_footprints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_case_events: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["review_status"] | null
          visible_to_owner: boolean
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["review_status"] | null
          visible_to_owner?: boolean
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["review_status"] | null
          visible_to_owner?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "support_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_case_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_case_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_cases: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          owner_user_id: string | null
          privacy: Database["public"]["Enums"]["privacy_scope"]
          private_detail: string | null
          public_summary: string | null
          status: Database["public"]["Enums"]["review_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          owner_user_id?: string | null
          privacy?: Database["public"]["Enums"]["privacy_scope"]
          private_detail?: string | null
          public_summary?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          owner_user_id?: string | null
          privacy?: Database["public"]["Enums"]["privacy_scope"]
          private_detail?: string | null
          public_summary?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_cases_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          leader_user_id: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_user_id?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_user_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          recipient_user_id: string
          related_id: string | null
          related_type: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          recipient_user_id: string
          related_id?: string | null
          related_type?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          recipient_user_id?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          source_id: string | null
          source_type: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type: string
          user_id: string
          xp: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      admin_esg_evidence_workbench: {
        Row: {
          delivery_ready: boolean | null
          enterprise_id: string | null
          enterprise_name: string | null
          export_ready: boolean | null
          id: string | null
          period_label: string | null
          quality_issues: string[] | null
          report_ready: boolean | null
          source_reference: string | null
          source_type: string | null
          source_verified: boolean | null
          status: Database["public"]["Enums"]["review_status"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_annual_report: {
        Row: {
          asset_types: number | null
          enterprise_id: string | null
          items: Json | null
          period_label: string | null
          report_ready_assets: number | null
          sdg_tags: string[] | null
        }
        Relationships: []
      }
      enterprise_case_workbench: {
        Row: {
          assigned_to: string | null
          case_number: string | null
          company_name: string | null
          id: string | null
          is_overdue: boolean | null
          last_enterprise_reply_at: string | null
          next_action: string | null
          next_action_due_at: string | null
          service_tier: string | null
          status: Database["public"]["Enums"]["review_status"] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          case_number?: string | null
          company_name?: string | null
          id?: string | null
          is_overdue?: never
          last_enterprise_reply_at?: never
          next_action?: string | null
          next_action_due_at?: string | null
          service_tier?: string | null
          status?: Database["public"]["Enums"]["review_status"] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          case_number?: string | null
          company_name?: string | null
          id?: string | null
          is_overdue?: never
          last_enterprise_reply_at?: never
          next_action?: string | null
          next_action_due_at?: string | null
          service_tier?: string | null
          status?: Database["public"]["Enums"]["review_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_sharing_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      enterprise_esg_annual_delivery_report: {
        Row: {
          deliverable_count: number | null
          enterprise_id: string | null
          period_label: string | null
          sdg_tags: string[] | null
          total_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_esg_annual_summary: {
        Row: {
          asset_categories: number | null
          enterprise_id: string | null
          metric_value_total: number | null
          period_label: string | null
          report_ready_assets: number | null
          sdg_tags: string[] | null
        }
        Relationships: []
      }
      enterprise_esg_delivery_readiness: {
        Row: {
          delivery_ready: boolean | null
          enterprise_id: string | null
          export_ready: boolean | null
          id: string | null
          period_label: string | null
          quality_issues: string[] | null
          report_ready: boolean | null
          source_reference: string | null
          source_type: string | null
          source_verified: boolean | null
          status: Database["public"]["Enums"]["review_status"] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_esg_evidence_chain: {
        Row: {
          asset_id: string | null
          asset_type: string | null
          enterprise_id: string | null
          evidence_note: string | null
          metric_label: string | null
          metric_unit: string | null
          metric_value: number | null
          period_label: string | null
          report_ready: boolean | null
          sdg_tags: string[] | null
          source_id: string | null
          source_reference: string | null
          source_type: string | null
          source_verified: boolean | null
          status: Database["public"]["Enums"]["review_status"] | null
          summary: string | null
          title: string | null
        }
        Insert: {
          asset_id?: string | null
          asset_type?: string | null
          enterprise_id?: string | null
          evidence_note?: string | null
          metric_label?: string | null
          metric_unit?: string | null
          metric_value?: number | null
          period_label?: string | null
          report_ready?: boolean | null
          sdg_tags?: string[] | null
          source_id?: string | null
          source_reference?: never
          source_type?: string | null
          source_verified?: never
          status?: Database["public"]["Enums"]["review_status"] | null
          summary?: string | null
          title?: string | null
        }
        Update: {
          asset_id?: string | null
          asset_type?: string | null
          enterprise_id?: string | null
          evidence_note?: string | null
          metric_label?: string | null
          metric_unit?: string | null
          metric_value?: number | null
          period_label?: string | null
          report_ready?: boolean | null
          sdg_tags?: string[] | null
          source_id?: string | null
          source_reference?: never
          source_type?: string | null
          source_verified?: never
          status?: Database["public"]["Enums"]["review_status"] | null
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_esg_export_quality: {
        Row: {
          enterprise_id: string | null
          export_ready: boolean | null
          id: string | null
          period_label: string | null
          quality_issues: string[] | null
          report_ready: boolean | null
          status: Database["public"]["Enums"]["review_status"] | null
          title: string | null
        }
        Insert: {
          enterprise_id?: string | null
          export_ready?: never
          id?: string | null
          period_label?: string | null
          quality_issues?: never
          report_ready?: boolean | null
          status?: Database["public"]["Enums"]["review_status"] | null
          title?: string | null
        }
        Update: {
          enterprise_id?: string | null
          export_ready?: never
          id?: string | null
          period_label?: string | null
          quality_issues?: never
          report_ready?: boolean | null
          status?: Database["public"]["Enums"]["review_status"] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_esg_management_summary: {
        Row: {
          approved_assets: number | null
          delivery_ready_assets: number | null
          enterprise_id: string | null
          needs_attention_assets: number | null
          period_label: string | null
          report_ready_assets: number | null
          source_types: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_annual_report"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_esg_annual_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_impact_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_management_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "enterprise_esg_assets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_impact_summary: {
        Row: {
          approved_shares: number | null
          completed_network_matches: number | null
          completed_network_requests: number | null
          enterprise_id: string | null
        }
        Relationships: []
      }
      enterprise_management_summary: {
        Row: {
          active_cases: number | null
          approved_outcomes: number | null
          deliverable_outcomes: number | null
          enterprise_id: string | null
          enterprise_name: string | null
          overdue_cases: number | null
          sdg_coverage: number | null
        }
        Insert: {
          active_cases?: never
          approved_outcomes?: never
          deliverable_outcomes?: never
          enterprise_id?: string | null
          enterprise_name?: never
          overdue_cases?: never
          sdg_coverage?: never
        }
        Update: {
          active_cases?: never
          approved_outcomes?: never
          deliverable_outcomes?: never
          enterprise_id?: string | null
          enterprise_name?: never
          overdue_cases?: never
          sdg_coverage?: never
        }
        Relationships: []
      }
      public_impact_summary: {
        Row: {
          active_partners: number | null
          completed_public_network_requests: number | null
          public_enterprise_shares: number | null
          published_cycle_stories: number | null
        }
        Relationships: []
      }
      user_sharing_summary: {
        Row: {
          care_count: number | null
          connection_count: number | null
          footprint_count: number | null
          latest_footprint_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      account_mark_all_notifications_read: { Args: never; Returns: number }
      account_referral_source: {
        Args: never
        Returns: {
          accepted_at: string
          invitation_id: string
          inviter_display_name: string
          source_type: string
          team_name: string
        }[]
      }
      account_save_my_one_preferences: {
        Args: { p_share_modes: string[] }
        Returns: undefined
      }
      account_set_notification_read: {
        Args: { p_notification_id: string; p_read: boolean }
        Returns: undefined
      }
      account_update_basic_profile: {
        Args: { p_display_name: string; p_mobile: string }
        Returns: undefined
      }
      activity_register_participation: {
        Args: { p_activity_id: string; p_source_channel?: string }
        Returns: string
      }
      admin_approve_esg_asset: {
        Args: {
          p_asset_id: string
          p_note?: string
          p_period_label?: string
          p_summary: string
          p_title: string
        }
        Returns: undefined
      }
      admin_finalize_esg_asset: {
        Args: {
          p_asset_id: string
          p_evidence_note?: string
          p_metric_label?: string
          p_metric_unit?: string
          p_metric_value?: number
          p_note?: string
          p_period_label?: string
          p_sdg_tags?: string[]
          p_summary: string
          p_title: string
        }
        Returns: undefined
      }
      admin_generate_outcome_drafts: {
        Args: {
          p_esg_summary?: string
          p_esg_title?: string
          p_queue_id: string
          p_story_summary?: string
          p_story_title?: string
        }
        Returns: Json
      }
      admin_issue_enterprise_badge: {
        Args: {
          p_badge_label?: string
          p_enterprise_id: string
          p_expires_at?: string
          p_year: number
        }
        Returns: string
      }
      admin_mark_case_due_reminder: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      admin_mark_esg_report_ready: {
        Args: { p_asset_id: string; p_note?: string; p_ready: boolean }
        Returns: undefined
      }
      admin_publish_cycle_story: {
        Args: {
          p_anonymized: boolean
          p_consent: boolean
          p_note?: string
          p_story_id: string
          p_summary: string
          p_title: string
        }
        Returns: undefined
      }
      admin_referral_overview: {
        Args: never
        Returns: {
          accepted_at: string
          created_at: string
          expires_at: string
          invitation_id: string
          invitee_name: string
          inviter_name: string
          source_type: string
          status: string
          team_name: string
        }[]
      }
      admin_review_enterprise_application: {
        Args: {
          p_application_id: string
          p_decision: Database["public"]["Enums"]["review_status"]
          p_note?: string
        }
        Returns: string
      }
      admin_review_enterprise_share: {
        Args: {
          p_decision: string
          p_note?: string
          p_public_result?: boolean
          p_share_id: string
        }
        Returns: undefined
      }
      admin_review_identity_verification: {
        Args: {
          p_approved: boolean
          p_note?: string
          p_verification_id: string
        }
        Returns: undefined
      }
      admin_review_network_response: {
        Args: { p_decision: string; p_note?: string; p_response_id: string }
        Returns: undefined
      }
      admin_review_record_change: {
        Args: {
          p_decision: string
          p_request_id: string
          p_reviewer_note?: string
        }
        Returns: undefined
      }
      admin_review_reward_redemption: {
        Args: {
          p_decision: Database["public"]["Enums"]["review_status"]
          p_note?: string
          p_redemption_id: string
        }
        Returns: undefined
      }
      admin_revoke_enterprise_badge: {
        Args: { p_badge_id: string; p_note?: string }
        Returns: undefined
      }
      admin_set_esg_evidence_review: {
        Args: { p_asset_id: string; p_note?: string; p_report_ready: boolean }
        Returns: undefined
      }
      admin_set_membership: {
        Args: {
          p_member_number?: string
          p_member_since?: string
          p_membership_type: Database["public"]["Enums"]["membership_type"]
          p_note?: string
          p_status?: string
          p_user_id: string
        }
        Returns: string
      }
      admin_set_platform_role: {
        Args: { p_enabled: boolean; p_role_key: string; p_user_id: string }
        Returns: undefined
      }
      admin_update_enterprise_service_request: {
        Args: {
          p_assigned_to?: string
          p_next_action?: string
          p_next_action_due_at?: string
          p_note?: string
          p_request_id: string
          p_status: string
          p_visible_to_enterprise?: boolean
        }
        Returns: undefined
      }
      admin_update_network_match: {
        Args: { p_note?: string; p_response_id: string; p_status: string }
        Returns: undefined
      }
      admin_update_support_case: {
        Args: {
          p_assigned_to?: string
          p_case_id: string
          p_internal_note?: string
          p_owner_note: string
          p_status: Database["public"]["Enums"]["review_status"]
        }
        Returns: undefined
      }
      admin_upsert_activity: {
        Args: {
          p_activity_id: string
          p_category?: string
          p_code: string
          p_ends_at?: string
          p_name: string
          p_public_summary?: string
          p_starts_at?: string
          p_status?: string
        }
        Returns: string
      }
      admin_upsert_reward_catalog: {
        Args: {
          p_category: string
          p_description: string
          p_ends_at?: string
          p_min_footprints: number
          p_min_level: number
          p_point_cost: number
          p_reward_id: string
          p_starts_at?: string
          p_status: Database["public"]["Enums"]["review_status"]
          p_stock_total: number
          p_title: string
        }
        Returns: string
      }
      admin_upsert_team: {
        Args: {
          p_description: string
          p_is_active?: boolean
          p_leader_user_id: string
          p_name: string
          p_team_id: string
        }
        Returns: string
      }
      admin_verify_participation: {
        Args: {
          p_approved: boolean
          p_note?: string
          p_participation_id: string
        }
        Returns: undefined
      }
      cancel_my_activity_participation: {
        Args: { p_participation_id: string }
        Returns: undefined
      }
      decide_network_response: {
        Args: { p_decision: string; p_response_id: string }
        Returns: undefined
      }
      enterprise_add_member_by_email: {
        Args: { p_email: string; p_enterprise_id: string; p_role?: string }
        Returns: string
      }
      enterprise_cancel_share: {
        Args: { p_share_id: string }
        Returns: undefined
      }
      enterprise_remove_member: {
        Args: { p_enterprise_id: string; p_user_id: string }
        Returns: undefined
      }
      enterprise_reply_service_request: {
        Args: { p_message: string; p_request_id: string }
        Returns: string
      }
      enterprise_resubmit_share: {
        Args: {
          p_description?: string
          p_share_id: string
          p_share_type?: Database["public"]["Enums"]["share_type"]
          p_title: string
        }
        Returns: undefined
      }
      enterprise_submit_service_request: {
        Args: {
          p_company_name: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_goal: string
          p_needs: string[]
          p_service_tier: string
        }
        Returns: string
      }
      enterprise_submit_share: {
        Args: { p_description: string; p_share_type: string; p_title: string }
        Returns: string
      }
      is_active_member: { Args: { target_user?: string }; Returns: boolean }
      is_enterprise_manager: { Args: { target: string }; Returns: boolean }
      member_submit_network_request: {
        Args: {
          p_private_detail: string
          p_public_summary: string
          p_request_kind: string
          p_requester_enterprise_id?: string
          p_title: string
        }
        Returns: string
      }
      network_cancel_profile: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      network_set_contact_consent: {
        Args: { p_consented: boolean; p_response_id: string }
        Returns: undefined
      }
      network_submit_profile: {
        Args: {
          p_category: string
          p_display_name: string
          p_public_description: string
          p_region: string
          p_website_url: string
        }
        Returns: string
      }
      network_submit_response: {
        Args: { p_message: string; p_request_id: string }
        Returns: string
      }
      owner_reply_support_case: {
        Args: { p_case_id: string; p_message: string }
        Returns: string
      }
      queue_completed_outcome: {
        Args: {
          p_enterprise_id?: string
          p_esg?: boolean
          p_source_id: string
          p_source_type: string
          p_story?: boolean
        }
        Returns: string
      }
      request_approved_record_change: {
        Args: {
          p_proposed_changes?: Json
          p_request_action: string
          p_requester_note?: string
          p_subject_id: string
          p_subject_type: string
        }
        Returns: string
      }
      request_enterprise_profile_change: {
        Args: {
          p_display_name: string
          p_enterprise_id: string
          p_industry: string
          p_public_description: string
          p_region: string
          p_requester_note?: string
        }
        Returns: string
      }
      request_identity_verification: {
        Args: { p_identity_token?: string; p_verification_kind: string }
        Returns: string
      }
      reward_submit_redemption: {
        Args: { p_reward_id: string }
        Returns: string
      }
      submit_enterprise_application: {
        Args: {
          p_company_name: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_direction: string
          p_region: string
          p_share_options: string[]
          p_tax_id: string
        }
        Returns: string
      }
      submit_support_case: {
        Args: {
          p_categories: string[]
          p_contact_name: string
          p_detail: string
          p_mobile: string
          p_region: string
        }
        Returns: string
      }
      team_accept_invitation: { Args: { p_token: string }; Returns: string }
      team_create_invitation: { Args: { p_team_id: string }; Returns: string }
      team_leave_current: { Args: never; Returns: undefined }
    }
    Enums: {
      membership_type: "annual" | "lifetime" | "inactive" | "pending"
      point_tx_type: "earn" | "spend" | "expire" | "adjust"
      privacy_scope: "public_summary" | "member_only" | "restricted"
      review_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "needs_info"
        | "approved"
        | "matched"
        | "completed"
        | "rejected"
        | "cancelled"
      share_type:
        | "care"
        | "connection"
        | "benefit"
        | "job"
        | "professional"
        | "resource"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      membership_type: ["annual", "lifetime", "inactive", "pending"],
      point_tx_type: ["earn", "spend", "expire", "adjust"],
      privacy_scope: ["public_summary", "member_only", "restricted"],
      review_status: [
        "draft",
        "submitted",
        "under_review",
        "needs_info",
        "approved",
        "matched",
        "completed",
        "rejected",
        "cancelled",
      ],
      share_type: [
        "care",
        "connection",
        "benefit",
        "job",
        "professional",
        "resource",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const

