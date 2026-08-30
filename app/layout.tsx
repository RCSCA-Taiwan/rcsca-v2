import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RCSCA V2 · 1% Cycle of Goodness',
  description: 'RCSCA V2 platform starter project',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
