import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from './database.types';
import {getSupabaseBrowserClient} from './supabase-browser';
type DataRequestsDatabase=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:Database['public']['Functions']&{
 personal_data_requests_self:{Args:Record<PropertyKey,never>;Returns:Json};
 personal_data_request_submit:{Args:{p_kind:string;p_changes:Json;p_reason:string;p_confirm_one:boolean;p_confirm_two:boolean;p_request:string|null};Returns:string};
 personal_data_request_cancel:{Args:{p_request:string};Returns:undefined};
 admin_personal_data_requests:{Args:Record<PropertyKey,never>;Returns:Json};
 admin_personal_data_request_review:{Args:{p_request:string;p_decision:string;p_note:string;p_execution_confirmed:boolean};Returns:undefined};
}}};
export function getDataRequestsClient(){return getSupabaseBrowserClient() as unknown as SupabaseClient<DataRequestsDatabase>;}
