'use client';
import SiteHeader from '../SiteHeader';
import FulfillmentFields,{type FulfillmentDraft} from './FulfillmentFields';
import {getFulfillmentClient} from '../../lib/reward-fulfillment-api';
import {fulfillmentError,shippingLabels} from '../../lib/reward-fulfillment';
import '../fulfillment.css';
import PointsExpiry from '../PointsExpiry';
import type {PointsWallet} from '../../lib/points';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';
import { useI18n } from '../i18n';
import { marketCopy } from './marketCopy';
import {getOfferClient,type PublicOfferMedia} from '../../lib/partner-offers';
import OfferImages from '../components/OfferImages';
import '../partner-offers.css';

type Category = 'all' | 'daily' | 'selected' | 'rare' | 'secret';
type Reward = {
  fulfillment_type?:string;shipping_policy?:string;shipping_note?:string|null;booking_hold_hours?:number;
  id: string; category: Exclude<Category, 'all'>; title: string; description: string | null;
  point_cost: number; stock_remaining: number | null; stock_total: number | null;
  min_level: number | null; min_footprints: number; starts_at: string | null; ends_at: string | null;
};
type Account = { signed: boolean; member: boolean; points: number; wallet?:PointsWallet; level: number; footprints: number; pending: string[] };
const emptyAccount: Account = { signed: false, member: false, points: 0, level: 1, footprints: 0, pending: [] };
export default function ShareMarket() {
  const { t, locale } = useI18n();
  const c = marketCopy[locale];
  const [cat, setCat] = useState<Category>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [media,setMedia]=useState<Record<string,PublicOfferMedia>>({});
  const [account, setAccount] = useState<Account>(emptyAccount);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<'sent' | 'failed' | 'membershipFailed' | null>(null);
  const [draft,setDraft]=useState<FulfillmentDraft>({slot:'',details:{destination_type:'home'},consent:false});
  const [fulfillmentNotice,setFulfillmentNotice]=useState('');
  const inFlight = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const categoryLabels = { daily: t('market.daily'), selected: t('market.selected'), rare: t('market.rare'), secret: t('market.secret') };
  useEffect(()=>{let alive=true;void getOfferClient().rpc('public_partner_offer_media').then(({data,error})=>{if(alive)setMedia(error?{}:Object.fromEntries((data as unknown as PublicOfferMedia[]||[]).map(row=>[row.reward_id,row])));});return()=>{alive=false}},[attempt]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setReadError(false);
      try {
        const s = getSupabaseBrowserClient();
        const [catalog, session] = await Promise.all([
          s.from('reward_catalog').select('id,category,title,description,point_cost,stock_remaining,stock_total,min_level,min_footprints,starts_at,ends_at,fulfillment_type,shipping_policy,shipping_note,booking_hold_hours').eq('status', 'approved').order('point_cost'),
          s.auth.getSession(),
        ]);
        if (catalog.error) throw catalog.error;
        if (session.error) throw session.error;
        const user = session.data.session?.user;
        let next = emptyAccount;
        if (user) {
          const [points, level, footprints, membership, pending] = await Promise.all([
            s.rpc('point_wallet_self'),
            s.from('member_levels').select('level').eq('user_id', user.id).maybeSingle(),
            s.from('sharing_footprints').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            s.from('memberships').select('status').eq('user_id', user.id).maybeSingle(),
            s.from('reward_redemptions').select('reward_id,status,points_expires_at,reservation_until').eq('user_id', user.id).in('status', ['submitted', 'under_review', 'approved']),
          ]);
          for (const result of [points, level, footprints, membership, pending]) if (result.error) throw result.error;
          next = { signed: true, member: membership.data?.status === 'active',
            points: (points.data as unknown as PointsWallet).balance, wallet: points.data as unknown as PointsWallet,
            level: level.data?.level || 1, footprints: footprints.count || 0,
            pending: (pending.data || []).filter(row => row.status==='approved'||((!row.points_expires_at||new Date(row.points_expires_at).getTime()>Date.now())&&(!row.reservation_until||new Date(row.reservation_until).getTime()>Date.now()))).map(row => row.reward_id) };
        }
        if (!cancelled) { setRewards((catalog.data || []) as Reward[]); setAccount(next); }
      } catch { if (!cancelled) setReadError(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => { if (selected && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [selected]);
  const list = useMemo(() => rewards.filter(r => cat === 'all' || r.category === cat), [cat, rewards]);
  const item = rewards.find(r => r.id === selected);
  function remaining(r:Reward){return media[r.id]?.available_quantity??r.stock_remaining;}
  function availability(r:Reward){const now=Date.now();return r.ends_at&&new Date(r.ends_at).getTime()<=now?c.closed:r.starts_at&&new Date(r.starts_at).getTime()>now?c.notStarted:remaining(r)===0?c.soldOut:c.open;}
  function eligible(r: Reward) {
    const now = Date.now();
    return !loading && !readError && account.signed && account.member && !account.pending.includes(r.id) &&
      account.points >= r.point_cost && account.level >= (r.min_level || 1) &&
      account.footprints >= r.min_footprints && (remaining(r) === null || (remaining(r)??0) > 0) &&
      (!r.starts_at || new Date(r.starts_at).getTime() <= now) && (!r.ends_at || new Date(r.ends_at).getTime() > now);
  }
  async function redeem(r: Reward) {
    if (inFlight.current || !eligible(r)) return;
    inFlight.current = true; setBusy(true); setMessage(null);setFulfillmentNotice('');
    try {
      const s = getSupabaseBrowserClient();
      const { error } = r.fulfillment_type&&r.fulfillment_type!=='code'?await getFulfillmentClient().rpc('reward_submit_fulfillment',{p_reward:r.id,p_slot:draft.slot||null,p_details:draft.details,p_consent:draft.consent}):await s.rpc('reward_submit_redemption', { p_reward_id: r.id });
      if (error) {
        if (error.message.includes('active_membership_required')) {
          setAccount(a => ({ ...a, member: false })); setMessage('membershipFailed'); return;
        }
        if (error.message.includes('existing_redemption_pending')) {
          setAccount(a => ({ ...a, pending: [...a.pending, r.id] })); setMessage('failed'); return;
        }
        if(r.fulfillment_type&&r.fulfillment_type!=='code'){setFulfillmentNotice(fulfillmentError(error));return;}
        throw error;
      }
      setAccount(a => ({ ...a, pending: [...a.pending, r.id] }));
      setMessage('sent');
      if(r.fulfillment_type==='service'){const w=await s.rpc('point_wallet_self');if(!w.error&&w.data)setAccount(a=>({...a,points:(w.data as unknown as PointsWallet).balance,wallet:w.data as unknown as PointsWallet}));}
    } catch { setMessage('failed'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function close() { if (!busy) { setSelected(null); setMessage(null); } }
  const balance = loading || readError ? '—' : account.signed ? account.points.toLocaleString(locale) : c.signedOut;
  return <main className="marketPage"><SiteHeader />
    <section className="marketHero"><div className="portalWrap"><div>
      <div className="eyebrow">1% 共享所</div><h1>{t('market.title')}</h1><p>{t('market.lead')}</p>
      <a className="outlineLight" href="/sharing-rules">{c.rules} →</a>
    </div><div className="marketWallet"><small>{t('market.points')}</small>
      <strong aria-live="polite">{balance}</strong>
      {!loading && !readError && account.signed && <span>Lv.{account.level} · {account.footprints} {c.footprints}</span>}
      {!loading&&!readError&&account.signed&&<PointsExpiry wallet={account.wallet||null} onRetry={()=>setAttempt(x=>x+1)}/> }
    </div></div></section>
    <section className="portalSection"><div className="portalWrap">
      <p>{c.memberOnly} <a className="textRoute" href="/account/identity">{c.identity} →</a></p>
      <div className="marketTabs">{(['all', 'daily', 'selected', 'rare', 'secret'] as Category[]).map(key =>
        <button key={key} aria-pressed={cat === key} className={cat === key ? 'active' : ''} onClick={() => setCat(key)}>
          {key === 'all' ? t('market.all') : categoryLabels[key]}
        </button>)}</div>
      {loading ? <div className="liveAccountLoading">{t('market.loading')}</div> :
        readError ? <div role="alert" className="privacyCallout"><p>{c.readError}</p>
          <button className="secondaryAction" onClick={() => setAttempt(a => a + 1)}>{c.retry}</button></div> :
        <div className="marketGrid">{list.length ? list.map(r => <article key={r.id} className={'rewardCard ' + (r.category === 'secret' ? 'secret' : '')}>
          <OfferImages paths={media[r.id]?.images||[]} title={r.title} cover/>
          {media[r.id]&&<div className="offerMeta"><span>{media[r.id].enterprise_name}</span><span>{media[r.id].period}</span></div>}
          <p className="offerAvailability">{availability(r)}</p>
          <small>{categoryLabels[r.category]}</small><h3>{r.title}</h3><p>{r.description}</p>
          <div className="rewardMeta"><b>{r.point_cost} {c.points}</b>
            <span>{remaining(r) === null ? c.unlimited : (r.fulfillment_type==='delivery'?c.units:c.available) + ' ' + remaining(r)}</span></div>
          <p className="micro">{r.ends_at ? c.ends + ' ' + new Date(r.ends_at).toLocaleDateString(locale) : c.noEnd}</p>
          <button onClick={() => { setMessage(null);setFulfillmentNotice('');setDraft({slot:'',details:{destination_type:'home'},consent:false}); setSelected(r.id); }}>{c.preview} →</button>
        </article>) : <p className="emptyData">{c.noItems}</p>}</div>}
    </div></section>
    {item && <dialog ref={dialog} className="marketRedemptionDialog" aria-labelledby="redemption-title" onCancel={e => { if (busy) e.preventDefault(); else close(); }}>
      <button className="modalClose" aria-label={c.close} disabled={busy} onClick={close}>×</button>
      <small>{categoryLabels[item.category]}</small><h2 id="redemption-title">{item.title}</h2><p>{item.description}</p>
      <OfferImages paths={media[item.id]?.images||[]} title={item.title}/>
      <p className="offerAvailability">{availability(item)}</p>
      <dl className="redemptionBalance">
        <div><dt>{c.balance}</dt><dd>{balance}</dd></div>
        <div><dt>{c.cost}</dt><dd>{item.point_cost.toLocaleString(locale)} {c.points}</dd></div>
        <div><dt>{c.after}</dt><dd>{account.signed && !readError && account.points >= item.point_cost ?
          (account.points - item.point_cost).toLocaleString(locale) : '—'}</dd></div>
      </dl>
      {!!item.min_level && <p>{c.minimum}: Lv.{item.min_level}</p>}
      {item.min_footprints > 0 && <p>{c.footprints}: {item.min_footprints}</p>}
      <p>{item.ends_at ? c.ends + ' ' + new Date(item.ends_at).toLocaleString(locale) : c.noEnd}</p>
      {item.fulfillment_type&&item.fulfillment_type!=='code'?<FulfillmentFields reward={item} value={draft} onChange={setDraft}/>:<p className="micro">{c.review}</p>}
      {fulfillmentNotice&&<p role="alert">{fulfillmentNotice}</p>}
      {!account.member && <p>{c.memberOnly} <a className="textRoute" href="/account/identity">{c.identity} →</a></p>}
      <button className="modalPrimary" disabled={busy || !eligible(item)||(!!item.fulfillment_type&&item.fulfillment_type!=='code'&&(!draft.consent||!draft.details.contact_name?.trim()||(draft.details.phone?.trim().length||0)<6||(item.fulfillment_type==='service'?!draft.slot:(!draft.details.address?.trim()||((draft.details.destination_type||'home')==='home'&&!/^[0-9]{3}([0-9]{2,3})?$/.test(draft.details.postal_code||''))))))} onClick={() => void redeem(item)}>
        {busy ? c.sending : account.pending.includes(item.id) ? c.pending : eligible(item) ? c.apply : c.locked}
      </button>
      {message && <p role="status" aria-live="polite">{message==='sent'&&item.fulfillment_type&&item.fulfillment_type!=='code'?'申請已送出，尚未扣點。服務預約會暫時保留點數與名額，夥伴確認後才扣點。':c[message]}</p>}
      <p><a className="textRoute" href="/account/redemptions">{c.requests} →</a></p>
    </dialog>}
  </main>;
}
