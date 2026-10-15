export type Referrer = { id: string; name: string; teams: {id: string; name: string}[] };
export type MembershipApplication = {
  id: string; user_id: string; application_kind: 'new'|'renewal'; membership_type: 'annual'|'lifetime';
  full_name: string; identity_mask: string; phone: string; email: string; address: string;
  referrer_id: string|null; proposed_team_id: string|null; join_team_consent: boolean;
  status: 'pending'|'needs_info'|'approved'|'rejected'; review_note: string|null; created_at: string;
  referrer_name?: string|null; team_name?: string|null;
};
export type DirectoryMember = {id: string; name: string; membership_type: 'annual'|'lifetime'; member_since: string; referrer_name: string|null; confirmed_at: string};
export const membershipStatus = {pending:'待審核',needs_info:'請補件後重新送出',approved:'已核准',rejected:'未通過'};
export function taiwanYear() { return Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric'}).format(new Date())); }
export function taiwanDate() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
const errors: Record<string,string> = {
  authentication_required:'請先登入後再操作。',admin_required:'目前帳號沒有會員管理權限。',
  active_membership_required:'此名冊限有效協會會員及會員管理員查看。',invalid_identity:'請確認身分證字號格式與檢查碼。',
  invalid_contact:'請確認姓名、電話、信箱與通訊地址。',application_pending:'你已有待審核申請，請先等待處理。',
  renewal_membership_not_found:'這個帳號尚未連結既有會籍；請聯絡協會核對，或選擇新會員加入。',
  invalid_referrer:'介紹人資料已變更，請重新選擇。',invalid_referrer_team:'介紹人與小隊關聯已變更，請重新選擇。',
  referrer_team_changed:'介紹人的小隊已變更，請退回補件，讓申請人重新確認。',
  applicant_already_in_other_team:'申請人已有其他小隊，請退回補件確認，不會覆寫既有小隊。',
  cannot_review_own_application:'管理員不能審核自己的會員申請。',application_not_pending:'此申請已處理，請重新整理。',
  original_member_since_required:'請沿用已確認的原入會日期，續會不重設入會日期。',
  membership_year_already_confirmed:'該會員本年度名冊已確認，不能重複建立。',
  cannot_downgrade_lifetime:'永久會員不能藉續會降為一般會員。',
  invalid_membership_period:'請確認台灣當年度與正式入會日期。',eligibility_confirmation_required:'請先確認會籍資格與必要繳費程序。',
  consent_required:'請先同意本次會員資料的使用目的。',
};
export function membershipError(error: {message?: string; code?: string}|unknown) {
  const e = error as {message?:string;code?:string};
  if(e?.code==='23505') return '資料已存在或小隊關聯已改變，請重新整理後確認。';
  return errors[e?.message||''] || '目前無法完成操作，請重試；若持續失敗，請聯絡協會。';
}
