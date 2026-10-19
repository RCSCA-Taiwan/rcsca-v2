type NotificationSubject={kind:string;related_type:string|null;related_id:string|null};
export type NotificationRoute={href:string;label:'progress'|'fulfillment'};

// These are existing workflow pages; authorization remains in each destination.
const destinations=new Map([
 ['enterprise_service_request','/1percent-partner/requests'],
 ['enterprise_application','/1percent-partner/apply'],
 ['enterprise_share','/1percent-partner/dashboard'],
 ['partner_offer','/1percent-partner/offers'],
 ['enterprise','/1percent-partner/team'],
 ['enterprise_badge','/1percent-partner/dashboard'],
 ['enterprise_esg_asset','/1percent-partner/impact'],
 ['network_request','/1percent-network/matches'],
 ['network_match_response','/1percent-network/matches'],
 ['network_response','/1percent-network/matches'],
 ['network_profile','/1percent-network/join'],
 ['reward_redemption','/account/redemptions'],
 ['identity_verification','/account/identity'],
 ['membership','/account/identity'],
 ['profile','/account/profile'],
 ['team','/team'],
]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function notificationRoutes(n:NotificationSubject):NotificationRoute[]{
 if(!n.related_type||!n.related_id||!uuid.test(n.related_id))return [];
 if(n.related_type==='support_case')return [{href:`/account/requests/support/${n.related_id}`,label:'progress'}];
 const href=n.related_type==='profile'&&n.kind==='admin_role'?'/admin/operations':destinations.get(n.related_type);
 if(!href)return [];
 const routes:NotificationRoute[]=[{href,label:'progress'}];
 // The same event kind is used for both order owners and providers. Offer both
 // explicit destinations instead of guessing the recipient's role from text.
 if(n.related_type==='reward_redemption'&&['reward_fulfillment','reward_cancellation'].includes(n.kind)){
  routes.push({href:'/account/fulfillment',label:'fulfillment'});
 }
 return routes;
}
