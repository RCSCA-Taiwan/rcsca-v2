'use client';
import {useCallback,useEffect,useState} from 'react';
import {getCommunityClient} from '../../lib/community-api';
import FriendlyIcon from '../components/FriendlyIcon';
type Progress={day:string;topic_used:boolean;today_points:number;today_reply_topics:number;wallet:{balance:number}};
export default function DailyTasks(){
 const[data,setData]=useState<Progress|null>(null),[failed,setFailed]=useState(false);
 const load=useCallback(async()=>{const r=await getCommunityClient().rpc('community_daily_progress');setFailed(!!r.error);if(!r.error)setData(r.data as unknown as Progress);},[]);
 useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('community-points-updated',refresh);const interval=setInterval(refresh,60000);return()=>{window.removeEventListener('community-points-updated',refresh);clearInterval(interval);};},[load]);
 return <section className="forumTasks" aria-labelledby="daily-task-title"><h2 id="daily-task-title">每日互動任務</h2><p>以台灣時間每日 00:00 更新主題額度。積分沿用個人入會週年效期，不增加 XP。</p>{failed?<p role="alert">任務進度讀取失敗。<button onClick={()=>void load()}>重試任務進度</button></p>:data?<><div className="forumTaskGrid"><article><FriendlyIcon name="heart"/><h3>提出一個交流主題 · +2 分</h3><p>審核通過後入帳。每天最多送出一個；待審、未通過或撤回仍占當日額度。</p><strong>{data.topic_used?'今日已送出 1／1 個主題':'今日可送出 1 個主題'}</strong><a href="#new-topic">{data.topic_used?'查看投稿入口與紀錄':'前往提出主題 →'}</a></article><article><FriendlyIcon name="people"/><h3>參與不同主題留言 · 每題 +1 分</h3><p>首次留言即入帳；同題後續留言、隔日重回與作者自回不另給分。不同主題可分別得分，沒有另設每日留言得分上限。</p><strong>今日已取得 {data.today_reply_topics} 個主題的留言積分</strong><a href="#forum-topics">前往參與討論 →</a></article></div><p className="workflowNotice">{data.day} 今日論壇入帳：{data.today_points} 分 · 目前可用共享點：{data.wallet.balance} 分　<a href="/my-1percent">查看我的共享點 →</a></p></>:<p role="status">正在讀取今日任務…</p>}</section>;
}
