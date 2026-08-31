'use client';
import {useEffect,useState} from 'react';
import {getSupabaseBrowserClient} from '../../lib/supabase-browser';
type Row={published_cycle_stories:number;active_partners:number;public_enterprise_shares:number;completed_public_network_requests:number};
export default function LivePublicImpact(){const [r,setR]=useState<Row|null>(null);useEffect(()=>{(async()=>{const s=getSupabaseBrowserClient();if(!s)return;const {data}=await s.from('public_impact_summary').select('*').maybeSingle();if(data)setR(data as Row)})()},[]);if(!r)return null;return <section className="publicImpactStrip"><div><strong>{r.published_cycle_stories}</strong><span>已公開善循環案例</span></div><div><strong>{r.active_partners}</strong><span>已核准企業夥伴</span></div><div><strong>{r.public_enterprise_shares}</strong><span>公開企業共享</span></div><div><strong>{r.completed_public_network_requests}</strong><span>公開完成媒合</span></div></section>}
