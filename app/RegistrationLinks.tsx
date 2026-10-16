'use client';
import {useI18n} from './i18n';
import {registrationCopy} from '../lib/registration-copy';
import './register/registration.css';

export default function RegistrationLinks() {
  const {locale} = useI18n();
  const c = registrationCopy[locale];
  return <div className="registrationLinks"><a href="/register">{c.personal} →</a><a href="/register?type=enterprise">{c.enterprise} →</a><a href="/login">{c.existing} {c.signin} →</a></div>;
}
