'use client';
import SiteHeader from '../../SiteHeader';
import {useEffect,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {Locale,useI18n} from '../../i18n';

const pageCopy:Record<Locale,Record<string,string>>={
 'zh-Hant':{eye:'1% Network · 加入共享專業網絡',hero:'把你的專業，補進目前還缺的那一塊。',lead:'沒有獨家席位，也不販售產業名額。公開的是你選擇提供的專業資訊；私人聯絡方式仍留在媒合流程裡。',step1:'01 · 選擇專業',industry:'你的主要產業／專業',step2:'02 · 可公開資訊',name:'品牌／姓名',region:'所在縣市',website:'網站或社群（選填）',description:'一句話說明你能提供的專業或服務',publicLevel:'公開到什麼程度？',publicLead:'一般參觀者只能看到你主動填寫的名稱、產業、地區、公開介紹與網站。電話、Email 與會員資料不會直接出現在 1% Network。',matching:'真正需要媒合時',matchingLead:'需求摘要先送到可能的節點；雙方都願意，才交換必要聯絡方式。',sending:'送出中…',submit:'送出加入申請 →',mine:'我的 Network 申請',nodes:'已送出的專業節點',private:'核准前不會出現在公開目錄。'},
 'en':{eye:'1% Network · Join the professional network',hero:'Add your expertise where the network still has a gap.',lead:'There are no exclusive seats or industry slots for sale. Only the professional information you choose is public; private contact details stay within the matching process.',step1:'01 · Choose expertise',industry:'Your primary industry / expertise',step2:'02 · Public information',name:'Brand / name',region:'City or region',website:'Website or social profile (optional)',description:'Briefly describe the expertise or service you can offer',publicLevel:'What becomes public?',publicLead:'Visitors see only the name, industry, region, introduction, and website you provide. Phone numbers, email, and membership data never appear directly in the 1% Network.',matching:'When matching is needed',matchingLead:'A request summary first reaches possible nodes. Necessary contact details are exchanged only when both sides agree.',sending:'Submitting…',submit:'Submit application →',mine:'My Network applications',nodes:'Submitted professional nodes',private:'They stay out of the public directory until approved.'},
 'ja':{eye:'1% Network · 専門共有ネットワークに参加',hero:'まだ足りない場所に、あなたの専門性を。',lead:'独占枠や業種枠の販売はありません。公開されるのは自分で選んだ専門情報だけで、個人連絡先はマッチング手続き内に保たれます。',step1:'01 · 専門分野を選択',industry:'主な業種／専門分野',step2:'02 · 公開可能な情報',name:'ブランド／氏名',region:'地域',website:'Webサイト・SNS（任意）',description:'提供できる専門性やサービスを一文で説明',publicLevel:'どこまで公開されますか？',publicLead:'一般訪問者に見えるのは、入力した名称・業種・地域・紹介・Webサイトのみです。電話、メール、会員情報は1% Networkに直接表示されません。',matching:'実際にマッチングする時',matchingLead:'依頼概要を候補ノードへ届け、双方が希望した場合のみ必要な連絡先を交換します。',sending:'送信中…',submit:'参加申請を送信 →',mine:'自分のNetwork申請',nodes:'送信済み専門ノード',private:'承認前は公開ディレクトリに表示されません。'},
 'ko':{eye:'1% Network · 전문 공유 네트워크 참여',hero:'아직 비어 있는 곳에 당신의 전문성을 더하세요.',lead:'독점 자리나 업종 자리를 판매하지 않습니다. 직접 선택한 전문 정보만 공개되며 개인 연락처는 매칭 절차 안에서만 다룹니다.',step1:'01 · 전문 분야 선택',industry:'주요 업종／전문 분야',step2:'02 · 공개 가능 정보',name:'브랜드／이름',region:'지역',website:'웹사이트 또는 SNS(선택)',description:'제공할 수 있는 전문성이나 서비스를 한 문장으로 설명',publicLevel:'어디까지 공개되나요?',publicLead:'일반 방문자는 직접 입력한 이름, 업종, 지역, 소개와 웹사이트만 볼 수 있습니다. 전화번호, 이메일과 회원 정보는 1% Network에 직접 표시되지 않습니다.',matching:'실제 매칭이 필요할 때',matchingLead:'요청 요약이 가능한 노드에 먼저 전달되고 양측이 동의할 때만 필요한 연락처를 교환합니다.',sending:'제출 중…',submit:'참여 신청 제출 →',mine:'나의 Network 신청',nodes:'제출한 전문 노드',private:'승인 전에는 공개 목록에 표시되지 않습니다.'}
};

const fields=['室內設計','餐飲','法律','旅宿','交通運輸','寵物服務','醫療照護','教育','水電工程','保險','會計','汽車','其他'];
const statusLabel:Record<string,string>={submitted:'待審核',under_review:'審核中',needs_info:'待補資料',approved:'已公開',rejected:'未通過',cancelled:'已取消'};

export default function JoinNetwork(){
  const {locale}=useI18n(); const c=pageCopy[locale];
  const [category,setCategory]=useState('');
  const [form,setForm]=useState({display_name:'',region:'',website_url:'',public_description:''});
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [existing,setExisting]=useState<any[]>([]); const [editing,setEditing]=useState<any|null>(null);

  async function load(){
    try{const s=getSupabaseBrowserClient();const {data:{session}}=await s.auth.getSession();if(!session)return;const {data}=await s.from('network_profiles').select('id,category,display_name,region,website_url,public_description,status,public_visible').eq('user_id',session.user.id).order('updated_at',{ascending:false});setExisting(data||[])}catch{}
  }
  useEffect(()=>{load()},[]);

  async function submit(){
    setMessage('');
    if(!category||!form.display_name||!form.region||!form.public_description){setMessage('請先選擇專業，並填寫名稱、地區與公開說明。');return;}
    setBusy(true);
    try{
      const s=getSupabaseBrowserClient(); const {data:{session}}=await s.auth.getSession();
      if(!session){setMessage('請先登入，再送出加入申請。');setBusy(false);return;}
      const {error}=await s.rpc('network_submit_profile',{p_category:category,p_display_name:form.display_name,p_region:form.region,p_website_url:form.website_url,p_public_description:form.public_description});
      if(error){if(error.message.includes('profile_locked_after_approval')){setMessage('這個專業節點已經核准公開；若要修改或下架，請由 RCSCA 協助處理。');setBusy(false);return;}throw error;}
      setMessage('已送出加入申請。RCSCA 核准後，才會出現在公開 1% Network。');
      await load();
    }catch{setMessage('目前無法送出，請稍後再試。')}
    setBusy(false);
  }


  async function requestApprovedChange(row:any,action:'update'|'unpublish'){
    const s=getSupabaseBrowserClient(); setMessage('');
    const proposed=action==='update'?{category:row.category,display_name:row.display_name,region:row.region||'',website_url:row.website_url||'',public_description:row.public_description||'',public_visible:true}:{};
    const {error}=await s.rpc('request_approved_record_change',{p_subject_type:'network_profile',p_subject_id:row.id,p_request_action:action,p_proposed_changes:proposed,p_requester_note:action==='unpublish'?'申請將這個公開節點下架。':'申請更新已公開的 Network 節點。'});
    if(error){setMessage(error.message.includes('pending_change_request_exists')?'這個節點已有待審核的變更申請。':'目前無法送出變更申請。');return;}
    setMessage(action==='unpublish'?'已送出下架申請；核准前目前公開資料維持不變。':'已送出修改申請；核准前目前公開資料維持不變。'); setEditing(null);
  }

  async function cancel(id:string){if(!confirm('確定取消這個尚未核准的 Network 節點申請？'))return;const s=getSupabaseBrowserClient();const {error}=await s.rpc('network_cancel_profile',{p_profile_id:id});setMessage(error?'目前無法取消這筆申請。':'已取消這筆 Network 申請。');if(!error)await load()}

  return <main className="flowPage"><SiteHeader/>
    <section className="flowHero"><div className="portalWrap"><div className="eyebrow">{c.eye}</div><h1>{c.hero}</h1><p>{c.lead}</p></div></section>
    <section className="portalSection"><div className="portalWrap joinNetworkGrid"><div><small>{c.step1}</small><h2>{c.industry}</h2><div className="needPills">{fields.map(x=><button type="button" key={x} className={category===x?'active':''} onClick={()=>setCategory(x)}>{x}</button>)}</div><small className="blockLabel">{c.step2}</small><div className="briefFields"><input placeholder={c.name} value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})}/><input placeholder={c.region} value={form.region} onChange={e=>setForm({...form,region:e.target.value})}/><input placeholder={c.website} value={form.website_url} onChange={e=>setForm({...form,website_url:e.target.value})}/><textarea placeholder={c.description} value={form.public_description} onChange={e=>setForm({...form,public_description:e.target.value})}/></div></div>
      <aside className="networkJoinAside"><b>{c.publicLevel}</b><p>{c.publicLead}</p><b>{c.matching}</b><p>{c.matchingLead}</p><button disabled={busy} onClick={submit}>{busy?c.sending:c.submit}</button>{message&&<p className="formNote">{message}</p>}</aside>
    </div></section>
    {existing.length>0&&<section className="portalSection compactSection"><div className="portalWrap"><div className="sectionHead"><div><div className="eyebrow">{c.mine}</div><h2>{c.nodes}</h2></div><p>{c.private}</p></div><div className="portalGrid three">{existing.map(x=><article key={x.id}><small>{statusLabel[x.status]||x.status}</small><h3>{x.category}</h3><p>{x.display_name}{x.region?` · ${x.region}`:''}</p>{['submitted','under_review','needs_info','rejected'].includes(x.status)&&<button className="secondaryAction" onClick={()=>cancel(x.id)}>取消申請</button>}{x.status==='approved'&&<div className="shareInlineActions"><button className="secondaryAction" onClick={()=>setEditing({...x})}>申請修改</button><button className="secondaryAction" onClick={()=>requestApprovedChange(x,'unpublish')}>申請下架</button></div>}</article>)}</div></div></section>}

    {editing&&<div className="marketModal" onClick={()=>setEditing(null)}><div onClick={e=>e.stopPropagation()}><button className="modalClose" onClick={()=>setEditing(null)}>×</button><small>已核准公開資料 · 變更需重新審核</small><h2>申請修改 Network 節點</h2><div className="briefFields"><input value={editing.display_name||''} onChange={e=>setEditing({...editing,display_name:e.target.value})}/><input value={editing.region||''} onChange={e=>setEditing({...editing,region:e.target.value})}/><input value={editing.website_url||''} onChange={e=>setEditing({...editing,website_url:e.target.value})}/><textarea value={editing.public_description||''} onChange={e=>setEditing({...editing,public_description:e.target.value})}/></div><button className="modalPrimary" onClick={()=>requestApprovedChange(editing,'update')}>送出變更審核</button><p className="micro">送審期間，現在已核准的公開版本不會被直接覆寫。</p></div></div>}
  </main>
}
