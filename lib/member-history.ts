import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from './database.types';
import {getSupabaseBrowserClient} from './supabase-browser';
type HistoryDatabase=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:Database['public']['Functions']&{
 member_history_self:{Args:Record<PropertyKey,never>;Returns:Json};
 member_birthday_save:{Args:{p_birth_date:string|null;p_greetings:boolean};Returns:undefined};
 admin_member_birthdays:{Args:{p_month:number};Returns:Json};
 admin_legacy_members_import:{Args:{p_rows:Json;p_batch:string|null;p_note:string;p_commit:boolean;p_fingerprint:string};Returns:Json};
 legacy_member_preview:{Args:{p_name:string};Returns:Json};
 legacy_member_claim:{Args:{p_name:string;p_phone:string;p_identity:string;p_consent:boolean};Returns:string};
 admin_legacy_member_claims:{Args:Record<PropertyKey,never>;Returns:Json};
 admin_legacy_member_review:{Args:{p_claim:string;p_record:string|null;p_approve:boolean;p_note:string;p_confirmed:boolean};Returns:undefined};
 membership_submit_with_birthday:{Args:{p_kind:string;p_type:'annual'|'lifetime';p_name:string;p_identity:string;p_phone:string;p_email:string;p_address:string;p_source_text:string;p_join_team:boolean;p_consent:boolean;p_birth_date:string;p_greetings:boolean};Returns:string};
}}};
export const getHistoryClient=()=>getSupabaseBrowserClient() as unknown as SupabaseClient<HistoryDatabase>;
export type MemberHistory={birth_date:string|null;greetings_consent:boolean;membership_type:string|null;membership_status:string|null;member_since:string|null;years:number|null;claim:{status:'pending'|'approved'|'rejected';review_note:string|null}|null};
export type LegacyCandidate={id:string;name:string;email:string|null;phone:string|null;membership_type:string;member_since:string;membership_year:number;referrer_text:string|null};
export type LegacyClaim={id:string;user_id:string;name:string;email:string;phone:string|null;status:string;candidates:LegacyCandidate[]};
export function historyError(e:unknown){const m=(e as {message?:string})?.message;return ({invalid_birthday:'請填寫有效生日，不能晚於今天。',verified_account_required:'請先完成信箱驗證，再登入認領。',legacy_already_claimed:'這個帳號已連結歷年會籍，請重新讀取。',claim_contact_required:'請補填舊名冊上的電話或身分證，供協會核對。',legacy_record_unavailable:'名冊已被認領或核對資料不符，請重新讀取。',invalid_identity:'身分證格式或檢查碼不正確。',invalid_contact:'請檢查姓名與聯絡電話。',admin_required:'目前帳號沒有會員管理權限。',original_member_since_required:'與既有原始入會日期不同，請先人工核對。',application_pending:'此帳號仍有入會申請待審，請先處理。',cannot_downgrade_lifetime:'不能將永久會員降為一般會員。',eligibility_confirmation_required:'請先確認身分、原始名冊與年度資格。',membership_year_already_confirmed:'此年度已登錄，請先核對現有會籍。',application_not_pending:'申請已處理，請重新讀取。',cannot_review_own_application:'管理員不能審核自己的認領。'} as Record<string,string>)[m||'']||'操作未完成，請重試；若持續失敗，請聯絡協會。';}
