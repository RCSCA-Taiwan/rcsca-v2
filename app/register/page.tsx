'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import SiteHeader from '../SiteHeader';
import {useI18n} from '../i18n';
import {getSupabaseBrowserClient} from '../../lib/supabase-browser';
import {safeInternalPath} from '../../lib/auth-navigation';
import {registrationCopy} from '../../lib/registration-copy';
import './registration.css';

export default function RegisterPage() {
  const {locale} = useI18n();
  const c = registrationCopy[locale];
  const [ready, setReady] = useState(false);
  const [enterprise, setEnterprise] = useState(false);
  const [next, setNext] = useState('/my-1percent');
  const [invite, setInvite] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const sending = useRef(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setEnterprise(query.get('type') === 'enterprise');
    setNext(safeInternalPath(query.get('next'), '/my-1percent'));
    setInvite(query.get('invite') || '');
    setReady(true);
  }, []);
  const destination = enterprise ? '/1percent-partner/apply' : next;
  const loginQuery = new URLSearchParams({next: destination});
  if (invite && !enterprise) loginQuery.set('invite', invite);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || sending.current) return;
    sending.current = true;
    setStatus('sending');
    try {
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', destination);
      if (invite && !enterprise) callback.searchParams.set('invite', invite);
      const {error} = await getSupabaseBrowserClient().auth.signInWithOtp({
        email: email.trim(),
        options: {shouldCreateUser: true, emailRedirectTo: callback.toString()},
      });
      if (error) throw error;
      setStatus('sent');
    } catch {
      setStatus('error');
    } finally {
      sending.current = false;
    }
  }

  return <main className="authPage"><SiteHeader/><section className="authShell">
    <div className="eyebrow">RCSCA · {c.register}</div>
    <h1>{c.title}</h1>
    <div className="authModeSwitch" role="group" aria-label={c.register}>
      <button type="button" aria-pressed={!enterprise} className={!enterprise?'active':''} disabled={!ready||status==='sending'} onClick={()=>{setEnterprise(false);setStatus('idle')}}>{c.personal}</button>
      <button type="button" aria-pressed={enterprise} className={enterprise?'active':''} disabled={!ready||status==='sending'} onClick={()=>{setEnterprise(true);setStatus('idle')}}>{c.enterprise}</button>
    </div>
    <p>{enterprise ? c.enterpriseLead : c.personalLead}</p>
    <form onSubmit={submit} className="authForm">
      <label>{c.email}<input type="email" autoComplete="email" required maxLength={254} value={email} disabled={!ready||status==='sending'} onChange={event=>{setEmail(event.target.value);setStatus('idle')}} placeholder="name@example.com"/></label>
      <button disabled={!ready||status==='sending'||status==='sent'}>{status==='sending'?c.sending:c.send}</button>
    </form>
    {(status==='sent'||status==='error')&&<p className={`authMessage ${status}`} role={status==='error'?'alert':'status'}>{status==='sent'?c.sent:c.failed}</p>}
    <p className="authAssist">{c.existing} <a href={`/login?${loginQuery}`}>{c.signin} →</a></p>
    <p className="registrationPolicies"><a href="/privacy">{c.privacy}</a> · <a href="/terms">{c.terms}</a></p>
    <div className="authPrivacy"><strong>{c.member}</strong><span>{c.memberLead}</span><a href="/membership/apply">{c.member} →</a></div>
  </section></main>;
}
