'use client';
import {useEffect,useRef} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseBrowserClient} from '../lib/supabase-browser';
import type {Database,Json} from '../lib/database.types';

type SessionFunctions=Database['public']['Functions']&{
 account_status_self:{Args:never;Returns:Json};
};
type SessionDatabase=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:SessionFunctions}};
function client(){return getSupabaseBrowserClient() as unknown as SupabaseClient<SessionDatabase>}

export default function AccountSessionGuard(){
 const checking=useRef(false);
 useEffect(()=>{
  let live=true;
  const s=client();
  async function enforce(){
   if(checking.current||!live)return;
   checking.current=true;
   try{
    const {data:{user},error}=await s.auth.getUser();
    if(error||!user)return;
    const status=await s.rpc('account_status_self');
    if(status.error||!live)return;
    const payload=status.data&&typeof status.data==='object'&&!Array.isArray(status.data)?status.data as Record<string,unknown>:null;
    if(payload?.active===false){
      await s.auth.signOut({scope:'global'});
      if(live)window.location.replace('/login?inactive=1');
    }
   }finally{checking.current=false;}
  }
  void enforce();
  const {data:{subscription}}=s.auth.onAuthStateChange((event)=>{
   if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED')void enforce();
  });
  return()=>{live=false;subscription.unsubscribe();};
 },[]);
 return null;
}
