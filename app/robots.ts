import type {MetadataRoute} from 'next';
function siteBase(){
  if(process.env.NEXT_PUBLIC_SITE_URL)return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/,'');
  if(process.env.VERCEL_URL)return `https://${process.env.VERCEL_URL.replace(/\/$/,'')}`;
  return 'https://rcsca-v2.vercel.app';
}
export default function robots():MetadataRoute.Robots{
  const base=siteBase();
  return {rules:[{userAgent:'*',allow:'/',disallow:['/admin','/account','/auth','/team','/member-network','/membership','/my-1percent','/login','/care-actions/verification','/1percent-partner/dashboard','/1percent-partner/team','/1percent-partner/cases','/1percent-partner/requests','/1percent-network/matches']}],sitemap:`${base}/sitemap.xml`};
}
