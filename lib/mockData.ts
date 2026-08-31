import type {AuditEvent, PartnerShareRecord, ParticipationRecord, RequestRecord} from './domain';

export const personRequests: RequestRecord[] = [
  {id:'REQ-P-2408',ownerType:'person',category:'生活找人',title:'新北｜居家水電協助',status:'matched',updatedAt:'2026-08-29',nextStep:'等待雙方同意交換聯絡方式',privacy:'member_only'},
  {id:'REQ-P-2411',ownerType:'person',category:'工作',title:'友善二度就業｜行政兼職',status:'under_review',updatedAt:'2026-08-30',nextStep:'RCSCA 正在確認工作條件',privacy:'restricted'},
  {id:'REQ-P-2414',ownerType:'person',category:'公益行動',title:'2026 中秋物資認購',status:'completed',updatedAt:'2026-08-31',nextStep:'完成核實後建立共享足跡',privacy:'public_summary'}
];

export const enterpriseRequests: RequestRecord[] = [
  {id:'REQ-E-3102',ownerType:'enterprise',category:'ESG 專案',title:'2026 Q4 員工公益參與',status:'under_review',updatedAt:'2026-08-30',nextStep:'確認服務對象與執行範圍',privacy:'restricted'},
  {id:'REQ-E-3105',ownerType:'enterprise',category:'資源媒合',title:'提供平日場地 1%',status:'matched',updatedAt:'2026-08-31',nextStep:'等待合作單位確認檔期',privacy:'member_only'},
  {id:'REQ-E-3108',ownerType:'enterprise',category:'會員禮遇',title:'Q4 專屬服務禮遇',status:'needs_info',updatedAt:'2026-08-31',nextStep:'補充限制條件與有效期間',privacy:'public_summary'}
];

export const pendingParticipations: ParticipationRecord[] = [
  {id:'P-8821',activity:'2026 中秋物資認購',status:'pending',participationType:'轉帳',footprintCreated:false},
  {id:'P-8822',activity:'2026 中秋物資認購',status:'pending',participationType:'現金',footprintCreated:false},
  {id:'P-8823',activity:'偏鄉物資整理志工',status:'pending',participationType:'現場參與',footprintCreated:false}
];

export const partnerShares: PartnerShareRecord[] = [
  {id:'S-401',shareType:'care',title:'中秋物資支持',status:'completed',publicResult:true},
  {id:'S-402',shareType:'job',title:'提供 2 個友善職缺',status:'matched',publicResult:true},
  {id:'S-403',shareType:'benefit',title:'Q4 會員專屬禮遇',status:'under_review',publicResult:false}
];

export const auditPreview: AuditEvent[] = [
  {id:'A-901',action:'活動參與核實',actorRole:'活動管理員',subjectType:'participation',subjectId:'P-8818',createdAt:'2026-08-31 03:20',note:'核實完成；建立共享足跡'},
  {id:'A-902',action:'企業共享審核',actorRole:'企業管理員',subjectType:'enterprise_share',subjectId:'S-403',createdAt:'2026-08-31 03:28',note:'要求補充有效期間'},
  {id:'A-903',action:'媒合狀態更新',actorRole:'會員管理員',subjectType:'request',subjectId:'REQ-P-2408',createdAt:'2026-08-31 03:41',note:'雙方已看見摘要；尚未交換聯絡方式'}
];

export const statusLabel: Record<string,string> = {
  draft:'草稿',submitted:'已送出',under_review:'審核中',needs_info:'待補資料',approved:'已核准',matched:'已媒合',completed:'已完成',rejected:'未通過',cancelled:'已取消',pending:'待核實',verified:'已核實',unverified:'未核實'
};
