import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from './database.types';
import {getSupabaseBrowserClient} from './supabase-browser';
type D=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:Database['public']['Functions']&{
 partner_offer_list:{Args:{p_enterprise?:string;p_manage?:boolean};Returns:Json};
 partner_offer_save:{Args:{p_id:string;p_enterprise:string;p_details:Json;p_submit:boolean;p_revision:number;p_request:string};Returns:string};
 partner_offer_request_action:{Args:{p_id:string;p_action:string;p_revision:number};Returns:undefined};
 admin_partner_offer_review:{Args:{p_id:string;p_action:string;p_note:string;p_points:number|null;p_revision:number};Returns:string|null};
 public_partner_offer_media:{Args:Record<PropertyKey,never>;Returns:Json};
}}};
export function getOfferClient(){return getSupabaseBrowserClient() as unknown as SupabaseClient<D>;}
export type OfferDetails={title:string;description:string;period:string;quantity:number|null;starts_at:string;ends_at:string;mode:'delivery'|'service';terms:string;images:string[];shipping_policy:string;shipping_note:string;service_starts_at:string;service_ends_at:string};
export type PartnerOffer={id:string;enterprise_id:string;enterprise_name:string;provider_user_id:string;details:OfferDetails;state:string;revision:number;review_note:string|null;reward_id:string|null;point_cost:number|null;stock_remaining:number|null};
export type PublicOfferMedia={reward_id:string;images:string[];period:string;enterprise_name:string;available_quantity:number|null};
export const emptyOffer:OfferDetails={title:'',description:'',period:'',quantity:null,starts_at:'',ends_at:'',mode:'delivery',terms:'',images:[],shipping_policy:'free',shipping_note:'',service_starts_at:'',service_ends_at:''};
export const offerState:Record<string,string>={draft:'草稿',submitted:'待審核',needs_info:'待補資料',approved:'已核准上架',rejected:'未通過',withdraw_requested:'下架審核中',withdrawn:'已下架',cancelled:'已取消'};
export function offerError(error:unknown){const msg=String((error as {message?:string})?.message||'');if(/changed_reload|request_conflict/.test(msg))return '資料已更新，請重新讀取後再操作。';if(/independent_reviewer/.test(msg))return '請由另一位管理員審核，不能核准自己提出的項目。';if(/image_not_owned/.test(msg))return '圖片尚未上傳完成或沒有使用權限，請重新選擇圖片。';if(/invalid_service_slot/.test(msg))return '服務時段須在本期期間內、結束晚於開始，且每時段最多 100 位。';if(/expired/.test(msg))return '這期已截止，請複製為新一期並調整日期。';if(/enterprise|admin_required|active_provider/.test(msg))return '目前帳號沒有操作權限，或合作夥伴身份已變更。';if(/period_item_immutable/.test(msg))return '每期上架內容保留原版本，請新增下一期項目。';if(/invalid|complete_offer|note_required/.test(msg))return '請檢查必填資料、日期、數量及審核說明。';return '操作未完成，請重試；已送出的項目不會重複建立。';}
export function taipeiInput(value:string){return value?new Date(new Date(value).getTime()+8*3600000).toISOString().slice(0,16):'';}
export function taipeiISO(value:string){return value?new Date(value+':00+08:00').toISOString():'';}
