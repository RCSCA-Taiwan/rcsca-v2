'use client';
import FriendlyIcon from './components/FriendlyIcon';
import {useI18n} from './i18n';
import {registrationCopy} from '../lib/registration-copy';
import './register/registration.css';

export default function RegistrationLinks() {
  const {locale} = useI18n();
  const c = registrationCopy[locale];
  return <div className="registrationLinks"><a href="/register"><FriendlyIcon name="people"/>{c.personal} →</a><a href="/register?type=enterprise"><FriendlyIcon name="shop"/>{c.enterprise} →</a><a href="/login">{c.existing} {c.signin} →</a></div>;
}
