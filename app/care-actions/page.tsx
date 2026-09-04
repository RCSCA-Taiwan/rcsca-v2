import { publicSelect } from '../../lib/supabase-public';
import CareClient from './CareClient';
type Activity={id:string;code:string;name:string;category:string;status:string;public_summary:string|null;starts_at:string|null;ends_at:string|null};
export const dynamic='force-dynamic';
export default async function Care(){const activities=await publicSelect<Activity>('activities','select=id,code,name,category,status,public_summary,starts_at,ends_at&status=in.(published,active,completed)&order=starts_at.desc.nullslast');return <CareClient activities={activities}/>}
