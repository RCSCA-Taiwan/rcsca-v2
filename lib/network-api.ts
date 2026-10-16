import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from './database.types';
import {getSupabaseBrowserClient} from './supabase-browser';
type Row={id:string;category:string;display_name:string;region:string|null;website_url:string|null;public_description:string|null};
type D=Omit<Database,'public'>&{public:Omit<Database['public'],'Views'|'Functions'>&{
 Views:Database['public']['Views']&{public_network_directory:{Row:Row;Relationships:[]}};
 Functions:Database['public']['Functions']&{network_submit_categorized_profile:{Args:{p_category:string;p_display_name:string;p_region:string;p_website_url:string;p_public_description:string};Returns:string}};
}};
export function getNetworkClient(){return getSupabaseBrowserClient() as unknown as SupabaseClient<D>;}
