import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';
import { getSupabaseBrowserClient } from './supabase-browser';

type MembershipDatabase = Omit<Database, 'public'> & {public: Omit<Database['public'],'Functions'> & {Functions: Database['public']['Functions'] & {

      membership_referrers: { Args: Record<PropertyKey, never>; Returns: Json }
      membership_applications_self: { Args: Record<PropertyKey, never>; Returns: Json }
      membership_directory: { Args: {p_year:number}; Returns: Json }
      admin_membership_applications: { Args: Record<PropertyKey, never>; Returns: Json }
      membership_submit: { Args: {p_kind:string;p_type:"annual"|"lifetime";p_name:string;p_identity:string;p_phone:string;p_email:string;p_address:string;p_referrer:string|null;p_team:string|null;p_join_team:boolean;p_consent:boolean}; Returns:string }
      admin_membership_review: { Args: {p_application:string;p_decision:string;p_note:string;p_member_since:string|null;p_year:number;p_eligibility_confirmed:boolean}; Returns:undefined }
      admin_membership_confirm_existing: { Args: {p_user:string;p_name:string;p_member_since:string;p_year:number;p_referrer:string|null;p_note:string}; Returns:undefined }

}}};
export function getMembershipClient() {
  return getSupabaseBrowserClient() as unknown as SupabaseClient<MembershipDatabase>;
}
