import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{
  const base=(process.env.NEXT_PUBLIC_SITE_URL||'https://www.rcsca.org').replace(/\/$/,'');
  return {rules:[{userAgent:'*',allow:'/',disallow:['/admin/','/account/','/auth/','/team/','/member-network/','/1percent-partner/dashboard','/1percent-partner/team','/1percent-partner/cases','/1percent-partner/requests','/1percent-network/matches']}],sitemap:`${base}/sitemap.xml`};
}
