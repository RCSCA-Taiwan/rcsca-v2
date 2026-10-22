import type {MetadataRoute} from 'next';

const publicRoutes=[
  '/', '/about', '/governance', '/privacy', '/terms', '/contact',
  '/1percent-partner', '/1percent-partner/esg', '/1percent-partner/collaboration',
  '/care-actions', '/care-actions/archive', '/care-actions/impact',
  '/1percent-network', '/1percent-network/directory',
  '/cycle-of-goodness', '/cycle-of-goodness/cases', '/share-market', '/register', '/guide'
];

function siteBase(){
  if(process.env.NEXT_PUBLIC_SITE_URL)return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/,'');
  if(process.env.VERCEL_URL)return `https://${process.env.VERCEL_URL.replace(/\/$/,'')}`;
  return 'https://rcsca-v2.vercel.app';
}

export default function sitemap():MetadataRoute.Sitemap{
  const base=siteBase();
  const now=new Date();
  return publicRoutes.map(route=>({url:`${base}${route}`,lastModified:now,changeFrequency:route==='/'?'weekly':'monthly',priority:route==='/'?1:0.7}));
}
