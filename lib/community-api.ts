import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from './database.types';
import {getSupabaseBrowserClient} from './supabase-browser';
type D=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:Database['public']['Functions']&{
 community_image_register:{Args:{p_path:string};Returns:string};
 community_post_submit:{Args:{p_id:string;p_title:string;p_body:string;p_category:string;p_images:string[];p_consent:boolean};Returns:string};
 community_posts_list:{Args:{p_manage:boolean};Returns:Json};
 community_post_withdraw:{Args:{p_id:string};Returns:undefined};
 admin_community_post_review:{Args:{p_id:string;p_status:string;p_note:string};Returns:undefined};
 community_post_report:{Args:{p_id:string;p_reason:string};Returns:undefined};
}}};
export function getCommunityClient(){return getSupabaseBrowserClient() as unknown as SupabaseClient<D>;}
export type CommunityPost={id:string;user_id:string;title:string;body:string;category:string;status:string;review_note:string|null;created_at:string;display_name:string|null;images:{id:string;path:string}[];reports:{reason:string;created_at:string}[]};
export const communityStatus:Record<string,string>={pending:'待審核',approved:'已發布',rejected:'未通過',hidden:'已下架',withdrawn:'已撤回'};
