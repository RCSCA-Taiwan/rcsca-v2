'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabaseBrowserClient} from '../../lib/supabase-browser';
export type Foot={id:string;created_at:string;footprint_type:string;description:string|null;source_type:string};
export type Participation={id:string;status:string;created_at:string;participation_type:string;source_channel:string|null;verified_at:string|null;activities:{name:string}|null};
function records<T>(result:PromiseSettledResult<{data:unknown;error:unknown}>,valid:(row:T)=>boolean):T[]|null{
 if(result.status!=='fulfilled'||result.value.error||!Array.isArray(result.value.data))return null;
 return result.value.data.every(valid)?result.value.data as T[]:null;
}
export function useActivityRecords(includeFootprints:boolean){
 const [loading,setLoading]=useState(true),[userId,setUserId]=useState<string|null>(null),[authFailed,setAuthFailed]=useState(false),[parts,setParts]=useState<Participation[]|null>(null),[feet,setFeet]=useState<Foot[]|null>(null);
 const request=useRef(0);
 const load=useCallback(async()=>{
  const sequence=++request.current;setLoading(true);setAuthFailed(false);
  try{
   const s=getSupabaseBrowserClient();const {data:{user},error}=await s.auth.getUser();if(error)throw error;
   if(sequence!==request.current)return;setUserId(user?.id||null);
   if(!user){setParts(null);setFeet(null);return;}
   const [p,f]=await Promise.allSettled([
    s.from('activity_participations').select('id,status,created_at,participation_type,source_channel,verified_at,activities(name)').eq('user_id',user.id).order('created_at',{ascending:false}),
    includeFootprints?s.from('sharing_footprints').select('id,created_at,footprint_type,description,source_type').eq('user_id',user.id).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null})
   ]);
   if(sequence!==request.current)return;
   setParts(records<Participation>(p,r=>!!r&&typeof r.id==='string'&&['unverified','pending','verified','rejected'].includes(r.status)&&typeof r.created_at==='string'&&(r.activities===null||!!r.activities&&typeof r.activities.name==='string')&&(r.source_channel===null||typeof r.source_channel==='string')&&(r.verified_at===null||typeof r.verified_at==='string')));
   setFeet(records<Foot>(f,r=>!!r&&typeof r.id==='string'&&typeof r.created_at==='string'&&typeof r.footprint_type==='string'&&typeof r.source_type==='string'&&(r.description===null||typeof r.description==='string')));
  }catch{if(sequence===request.current){setAuthFailed(true);setParts(null);setFeet(null);}}
  finally{if(sequence===request.current)setLoading(false);}
 },[includeFootprints]);
 useEffect(()=>{void load();return()=>{request.current++;};},[load]);
 return {loading,userId,authFailed,parts,feet,load};
}
