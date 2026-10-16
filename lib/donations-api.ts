import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from './database.types';
import {getSupabaseBrowserClient} from './supabase-browser';
type D=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:Database['public']['Functions']&{
 admin_donation_pledge_list:{Args:Record<string,never>;Returns:Json};
 admin_donation_pledge_save:{Args:{p_id:string;p_activity:string;p_payload:Json};Returns:string};
 admin_donation_import_preview:{Args:{p_activity:string;p_rows:Json};Returns:Json};
 admin_donation_import_commit:{Args:{p_id:string;p_activity:string;p_rows:Json;p_digest:string;p_verified:boolean};Returns:Json};
 donation_contribution_self:{Args:Record<PropertyKey,never>;Returns:Json};
 admin_donation_overview:{Args:Record<PropertyKey,never>;Returns:Json};
 admin_donation_record:{Args:{p_email:string;p_amount:number;p_received:string;p_reference:string;p_note:string;p_verified:boolean};Returns:string};
 admin_donation_void:{Args:{p_id:string;p_note:string};Returns:undefined};
 admin_donation_badge_rule:{Args:{p_id:string|null;p_label:string;p_threshold:number;p_period:string;p_effective:string;p_history:boolean;p_status:string;p_note:string;p_confirmed:boolean};Returns:string};
}}};
export function getDonationsClient(){return getSupabaseBrowserClient() as unknown as SupabaseClient<D>;}
export type DonationSummary={verified_total:number;rules_active:boolean;badges:{label:string;period:string;year:number|null}[];records:{activity_name?:string|null;pledged_amount?:number|null;id:string;amount:number;received_on:string;receipt_reference:string;status:string;void_note:string|null}[]};
export function donationError(e:unknown){const m=(e as {message?:string})?.message||'';return m.includes('duplicate_donation_reference')?'此收據或入帳編號已登錄，不會重複累計。':m.includes('cannot_verify_own_donation')?'不能核實自己的捐款，請由另一位管理員處理。':m.includes('donor_account_not_unique')?'找不到唯一的帳號，請確認登入信箱。':m.includes('policy_approval_required')?'啟用規則前須確認已取得協會核定。':'操作未完成，請核對資料、權限與最新狀態後重試。';}
