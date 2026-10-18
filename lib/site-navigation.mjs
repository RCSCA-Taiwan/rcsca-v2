// Shared labels keep the guide, workspace directory and page trail consistent.
export const PAGE_NAMES={
 '/':'首頁','/guide':'功能指南','/about':'認識 RCSCA','/governance':'協會治理','/privacy':'隱私權政策','/terms':'使用條款','/contact':'聯絡協會','/sharing-rules':'共享點與參與規則',
 '/login':'登入帳號','/register':'註冊帳號','/auth/recover':'恢復帳號','/auth/callback':'完成登入',
 '/my-1percent':'我的 1%','/my-1percent/start':'分享我的 1%','/share-market':'共享所','/community':'交流討論','/team':'我的小隊',
 '/account':'個人中心','/account/profile':'基本資料','/account/security':'帳號安全','/account/identity':'身份與會籍','/account/identity/verify':'身份驗證','/account/activity':'參與紀錄','/account/referral':'介紹人與小隊來源','/account/redemptions':'兌換與履約紀錄','/account/fulfillment':'履約工作台','/account/contributions':'捐款貢獻紀錄','/account/data-requests':'資料異動申請','/account/notifications':'通知','/account/requests':'申請進度',
 '/membership/apply':'入會／續會申請','/membership/claim':'歷年會員資料認領','/membership/directory':'年度會員名冊',
 '/member-network':'會員專屬網絡','/member-network/request':'提出生活與專業需求','/member-network/jobs':'工作機會','/member-network/talent-request':'提出人才需求',
 '/care-actions':'關懷行動','/care-actions/participate':'登記活動參與','/care-actions/request':'提出關懷需求','/care-actions/archive':'歷年行動紀錄','/care-actions/impact':'關懷成果','/care-actions/verification':'活動核實說明','/care-actions/mid-autumn':'中秋關懷行動',
 '/cycle-of-goodness':'善循環','/cycle-of-goodness/cases':'善循環案例',
 '/1percent-network':'共享專業網絡','/1percent-network/directory':'尋找專業夥伴','/1percent-network/join':'登錄專業服務','/1percent-network/matches':'查看媒合進度',
 '/1percent-partner':'共享合作夥伴','/1percent-partner/apply':'合作夥伴申請','/1percent-partner/dashboard':'合作夥伴工作台','/1percent-partner/offers':'我的每期供應','/1percent-partner/requests':'服務需求','/1percent-partner/impact':'共享成果','/1percent-partner/esg':'提出合作需求','/1percent-partner/collaboration':'合作流程','/1percent-partner/cases':'合作案例','/1percent-partner/team':'企業共享小隊',
 '/admin':'管理員中心','/admin/operations':'後台工作總覽與稽核','/admin/queue':'待辦與通知寄送','/admin/members':'會員管理','/admin/members/import':'匯入會員名冊','/admin/members/legacy':'歷年名冊與認領審核','/admin/members/birthdays':'會員生日祝賀名單','/admin/members/data-requests':'會員資料異動審核','/admin/activities':'活動主檔管理','/admin/verification':'活動參與核實','/admin/cases':'受保護需求案件','/admin/partners':'合作夥伴審核','/admin/enterprise-cases':'企業 ESG 合作案件','/admin/network':'專業網絡管理','/admin/rewards':'共享所與履約審核','/admin/contributions':'認購與捐款核實','/admin/outcomes':'成果整理與公開審核','/admin/community':'交流內容與圖片審核','/admin/change-requests':'公開資料修改與下架','/admin/teams':'共享小隊管理','/admin/referrals':'介紹來源追蹤','/admin/access':'管理角色與權限','/admin/data-readiness':'資料準備與驗證紀錄'
};
export const SECTION_PARENTS=[
 ['/1percent-partner','共享合作夥伴','/1percent-partner'],['/1percent-network','共享專業網絡','/1percent-network'],['/account','個人中心','/account'],['/admin','管理員中心','/admin/operations'],['/membership','協會會員',null],['/care-actions','關懷行動','/care-actions'],['/my-1percent','我的 1%','/my-1percent'],['/member-network','會員專屬網絡','/member-network'],['/cycle-of-goodness','善循環','/cycle-of-goodness']
];
export function pageLabel(path){
 if(PAGE_NAMES[path])return PAGE_NAMES[path];
 if(/^\/care-actions\/activity\/[^/]+$/.test(path))return '活動詳情';
 if(/^\/account\/requests\/support\/[^/]+$/.test(path))return '我的關懷需求進度';
 if(/^\/1percent-partner\/badge\/[^/]+$/.test(path))return '企業年度共享標章';
 return SECTION_PARENTS.find(([prefix])=>path===prefix||path.startsWith(prefix+'/'))?.[1];
}
export const ADMIN_WORKSPACES=[
 {title:'會員與帳號',lead:'從申請、原始會籍到資料異動，保留完整會員歷程。',items:[['/admin/members','入會、續會與會籍審核'],['/admin/members/legacy','歷年名冊保存及會員認領'],['/admin/members/import','已驗證帳號的年度名冊登錄'],['/admin/members/birthdays','依有效會籍及祝賀意願查詢'],['/admin/members/data-requests','修改、重置與刪除申請']]},
 {title:'關懷與活動',lead:'建立活動、處理需求，完成後核實參與及成果。',items:[['/admin/activities','建立活動主檔與公開期間'],['/admin/verification','核實參與、共享足跡及積分'],['/admin/cases','依權限處理受保護的關懷需求'],['/admin/outcomes','整理已核實且同意公開的成果']]},
 {title:'企業與專業媒合',lead:'從合作申請到案件與專業媒合，依進度銜接。',items:[['/admin/partners','企業身分、共享內容及年度標章'],['/admin/enterprise-cases','ESG 合作需求、執行與完成'],['/admin/network','專業服務、需求與媒合回應'],['/admin/change-requests','已公開內容的修改及下架審核']]},
 {title:'共享所與貢獻',lead:'管理供應、兌換履約及實際收到的貢獻。',items:[['/admin/rewards','每期供應、兌換、預約、配送及取消'],['/admin/contributions','認購名單、收款核實與貢獻紀錄'],['/sharing-rules','查看目前參與與共享點規則']]},
 {title:'交流與小隊',lead:'處理交流內容、圖片與介紹來源，串起參與關係。',items:[['/admin/community','討論、圖片、檢舉與下架'],['/admin/teams','管理小隊及加入關係'],['/admin/referrals','核對介紹來源與加入歷程']]},
 {title:'權限與營運',lead:'集中處理待辦、通知、權限及資料準備。',items:[['/admin/queue','查看各類待辦及通知寄送狀態'],['/admin/access','配置後台角色與權限'],['/admin/data-readiness','查看資料準備原則與驗證紀錄'],['/guide','開啟個人、企業與管理員功能指南']]}
];
