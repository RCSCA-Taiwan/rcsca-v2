import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database, Json} from './database.types';
import {getSupabaseBrowserClient} from './supabase-browser';

export type EnterpriseDetails = {
  industry_code:string;professional_codes:string[];network_public_consent:boolean;network_public_description:string;
  company_name:string;tax_id:string;industry:string;address:string;website_url:string;
  contact_name:string;contact_title:string;contact_email:string;contact_phone:string;
  phone_extension:string;mobile:string;region:string;contribution_kind:string;
  contribution_description:string;direction:string;
};
export type EnterpriseApplication = EnterpriseDetails & {id:string;status:string;review_note:string|null};
type ApplicationTable = Database['public']['Tables']['enterprise_applications'];
type D = Omit<Database,'public'> & {public:Omit<Database['public'],'Tables'|'Functions'> & {
  Tables:Omit<Database['public']['Tables'],'enterprise_applications'> & {enterprise_applications:Omit<ApplicationTable,'Row'> & {Row:ApplicationTable['Row'] & Partial<EnterpriseDetails>}};
  Functions:Database['public']['Functions'] & {submit_enterprise_registration:{Args:{p_details:Json;p_request:string;p_application:string|null};Returns:string}};
}};
export function getEnterpriseRegistrationClient(){return getSupabaseBrowserClient() as unknown as SupabaseClient<D>;}
export const emptyEnterpriseDetails:EnterpriseDetails={industry_code:'',professional_codes:[],network_public_consent:false,network_public_description:'',company_name:'',tax_id:'',industry:'',address:'',website_url:'',contact_name:'',contact_title:'',contact_email:'',contact_phone:'',phone_extension:'',mobile:'',region:'',contribution_kind:'',contribution_description:'',direction:'consult'};
