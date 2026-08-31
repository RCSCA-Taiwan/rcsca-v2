import './globals.css';
import type { Metadata } from 'next';
import MusicController from './MusicController';
export const metadata: Metadata = {title:'RCSCA · Cycle of Goodness × 1%',description:'RCSCA — 讓個人、企業、關懷與連結進入同一個善循環。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body><MusicController/>{children}</body></html>}
