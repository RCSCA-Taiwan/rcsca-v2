import type {MetadataRoute} from 'next';

const publicRoutes=[
  '/', '/about', '/governance', '/privacy', '/terms', '/contact',
  '/my-1percent', '/1percent-partner', '/1percent-partner/esg', '/1percent-partner/collaboration',
  '/care-actions', '/care-actions/archive', '/care-actions/impact',
  '/1percent-network', '/1percent-network/directory',
  '/cycle-of-goodness', '/cycle-of-goodness/cases', '/share-market', '/login'
];

export default function sitemap():MetadataRoute.Sitemap{
  const base=(process.env.NEXT_PUBLIC_SITE_URL||'https://www.rcsca.org').replace(/\/$/,'');
  const now=new Date();
  return publicRoutes.map(route=>({url:`${base}${route}`,lastModified:now,changeFrequency:route==='/'?'weekly':'monthly',priority:route==='/'?1:0.7}));
}
