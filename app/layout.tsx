import './globals.css';
import type { Metadata } from 'next';
import MusicController from './MusicController';
import SiteFooter from './SiteFooter';
import {I18nProvider} from './i18n';
export const metadata: Metadata = {title:'RCSCA · Cycle of Goodness × 1%',description:'RCSCA — 讓個人、企業、關懷與連結進入同一個善循環。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body><I18nProvider><MusicController/>{children}<SiteFooter/></I18nProvider></body></html>}
