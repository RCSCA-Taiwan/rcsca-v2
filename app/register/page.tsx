'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import SiteHeader from '../SiteHeader';
import {useI18n} from '../i18n';
import {getSupabaseBrowserClient} from '../../lib/supabase-browser';
import {safeInternalPath} from '../../lib/auth-navigation';
import {registrationCopy} from '../../lib/registration-copy';
import './registration.css';

const signupEnabled = (process.env.NEXT_PUBLIC_REGISTRATION_OPEN === 'true' && process.env.NEXT_PUBLIC_AUTH_EMAIL_ENABLED === 'true') || process.env.NODE_ENV === 'development';
const availabilityCopy = {
 'zh-Hant': ['線上註冊暫未開放','註冊與 Email 驗證服務都通過正式驗收後會在此開放。你可以先了解參與方式；已有帳號可使用密碼登入。','了解參與方式'],
 en: ['Online registration is not open yet','Registration will open after both registration and email verification pass production acceptance. Explore ways to participate or sign in with an existing password.','Explore ways to participate'],
 ja: ['オンライン登録は準備中です','登録とメール認証の両方が本番環境の検証を通過後に開放します。参加方法をご覧いただくか、既存のパスワードでログインしてください。','参加方法を見る'],
 ko: ['온라인 가입 준비 중','가입과 이메일 인증이 모두 운영 환경 검증을 통과한 뒤 개방됩니다. 참여 방법을 보거나 기존 비밀번호로 로그인하세요.','참여 방법 보기'],
};

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
    if (!signupEnabled || !ready || sending.current) return;
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
    {signupEnabled ? <form onSubmit={submit} className="authForm">
      <label>{c.email}<input type="email" autoComplete="email" required maxLength={254} value={email} disabled={!ready||status==='sending'} onChange={event=>{setEmail(event.target.value);setStatus('idle')}} placeholder="name@example.com"/></label>
      <button disabled={!ready||status==='sending'||status==='sent'}>{status==='sending'?c.sending:c.send}</button>
    </form> : <div className="authPrivacy" role="status" data-testid="registration-unavailable"><strong>{availabilityCopy[locale][0]}</strong><p>{availabilityCopy[locale][1]}</p><a href="/guide">{availabilityCopy[locale][2]} →</a></div>}
    {(status==='sent'||status==='error')&&<p className={`authMessage ${status}`} role={status==='error'?'alert':'status'}>{status==='sent'?c.sent:c.failed}</p>}
    <p className="authAssist">{c.existing} <a href={`/login?${loginQuery}`}>{c.signin} →</a></p>
    <p className="registrationPolicies"><a href="/privacy">{c.privacy}</a> · <a href="/terms">{c.terms}</a></p>
    <div className="authPrivacy"><strong>{c.member}</strong><span>{c.memberLead}</span><a href="/membership/apply">{c.member} →</a></div>
  </section></main>;
}
