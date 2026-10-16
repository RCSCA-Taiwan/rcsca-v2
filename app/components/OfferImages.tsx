'use client';
import {useEffect,useState} from 'react';
import {getOfferClient} from '../../lib/partner-offers';
import FriendlyIcon from './FriendlyIcon';
export default function OfferImages({paths,title,cover=false}:{paths:string[];title:string;cover?:boolean}){
 const [urls,setUrls]=useState<string[]>([]);const key=paths.join('|');
 useEffect(()=>{let alive=true;setUrls([]);if(paths.length)void getOfferClient().storage.from('partner-offer-media').createSignedUrls(paths,600).then(({data})=>{if(alive)setUrls((data||[]).flatMap(row=>row.signedUrl?[row.signedUrl]:[]));});return()=>{alive=false}},[key]);
 return <div className={cover?'offerCover':'offerImages'}>{urls.length?(cover?urls.slice(0,1):urls).map((url,index)=><img key={url} src={url} loading="lazy" alt={`${title} · 圖片 ${index+1}`} onError={()=>setUrls(old=>old.filter(item=>item!==url))}/>):<span className="offerImagePlaceholder"><FriendlyIcon name="gift"/><span>分享一點美好</span></span>}</div>;
}
