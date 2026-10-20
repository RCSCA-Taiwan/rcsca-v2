'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getFulfillmentClient} from '../../lib/reward-fulfillment-api';
type Client=ReturnType<typeof getFulfillmentClient>;
type Read<T>=(client:Client,userId:string)=>PromiseLike<{data:unknown;error:unknown}>;
export function useOwnedRecords<T>(read:Read<T>,valid:(row:T)=>boolean){
 const [rows,setRows]=useState<T[]|null>(null),[userId,setUserId]=useState<string|null>(null),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 const sequence=useRef(0);
 const load=useCallback(async()=>{
  const current=++sequence.current;setLoading(true);setFailed(false);
  try{
   const s=getFulfillmentClient();const {data:{user},error}=await s.auth.getUser();if(error)throw error;
   if(current!==sequence.current)return;setUserId(user?.id||null);
   if(!user){setRows(null);return;}
   const result=await read(s,user.id);if(result.error||!Array.isArray(result.data)||!result.data.every(valid))throw new Error('unconfirmed_records');
   if(current===sequence.current)setRows(result.data as T[]);
  }catch{if(current===sequence.current){setRows(null);setFailed(true);}}
  finally{if(current===sequence.current)setLoading(false);}
 },[read,valid]);
 useEffect(()=>{void load();return()=>{sequence.current++;};},[load]);
 return {rows,loading,failed,userId,load};
}
export async function verifiedRecordsClient(ownerId:string|null){
 const s=getFulfillmentClient();const {data:{user},error}=await s.auth.getUser();
 if(error||!ownerId||user?.id!==ownerId)throw new Error('owner_session_changed');
 return s;
}
