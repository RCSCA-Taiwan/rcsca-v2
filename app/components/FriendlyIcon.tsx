import type {ReactNode} from 'react';
export type IconName = 'heart'|'people'|'gift'|'sprout'|'home'|'calendar'|'search'|'shop'|'shield'|'mail'|'star'|'clipboard'|'network'|'arrow';
const paths: Record<IconName,ReactNode> = {
 heart:<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
 people:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4"/></>,
 gift:<><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3Zm0 0h4a3 3 0 1 0-3-3Z"/></>,
 sprout:<><path d="M12 21V11C5 12 2 8 3 3c6-1 10 2 9 8m0 4c0-7 4-10 9-9 1 6-3 10-9 9M6 21h12"/></>,
 home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-7h6v7"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h2m4 0h2m-8 3h2"/></>,
 search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
 shop:<><path d="M4 10v11h16V10M3 4h18l1 6a3 3 0 0 1-5 2 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-5-2ZM9 21v-6h6v6"/></>,
 shield:<><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
 mail:<><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></>,
 star:<path d="m12 3 3 6 6.5 1-4.7 4.6 1.1 6.4-5.9-3.1L6.1 21l1.1-6.4L2.5 10 9 9Z"/>,
 clipboard:<><rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6m-6 4h4"/></>,
 network:<><circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="m10 8-4 7m8-7 4 7M8 18h8"/></>,
 arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,
};
export default function FriendlyIcon({name,className=''}:{name:IconName;className?:string}) {
 return <span className={`friendlyIcon ${className}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" focusable="false">{paths[name]}</svg></span>;
}
