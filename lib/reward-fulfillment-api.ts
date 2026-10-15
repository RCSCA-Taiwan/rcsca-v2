import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from './database.types';
import {getSupabaseBrowserClient} from './supabase-browser';
type D=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:Database['public']['Functions']&{
 reward_available_slots:{Args:{p_reward:string};Returns:Json};
 reward_submit_fulfillment:{Args:{p_reward:string;p_slot:string|null;p_details:Json;p_consent:boolean};Returns:string};
 reward_fulfillment_list:{Args:{p_manage:boolean};Returns:Json};
 reward_fulfillment_action:{Args:{p_redemption:string;p_action:string;p_note?:string;p_slot?:string|null;p_carrier?:string;p_tracking?:string};Returns:undefined};
 admin_reward_fulfillment_catalog:{Args:Record<PropertyKey,never>;Returns:Json};
 admin_upsert_reward_with_fulfillment:{Args:{p_catalog:Json;p_settings:Json};Returns:string};
 admin_reward_slot_add:{Args:{p_reward:string;p_starts:string;p_ends:string;p_capacity:number};Returns:string};
}}};
export function getFulfillmentClient(){return getSupabaseBrowserClient() as unknown as SupabaseClient<D>;}
