"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import { useI18n, type Locale } from "../../i18n";
type Row = {
  kind: string;
  id: string;
  title: string;
  status: string;
  created_at: string;
  href: string;
  detail: string;
};
const copy: Record<Locale, Record<string, string>> = {
  "zh-Hant": {
    signin: "請先使用具管理權限的帳號登入。",
    partial: "目前帳號沒有完整後台權限，或部分工作佇列暫時無法讀取。",
    loading: "正在整理後台工作佇列…",
    empty: "目前沒有待處理項目。",
    submitted: "已送出",
    under_review: "審核中",
    needs_info: "待補資料",
    pending: "待核實",
    matched: "媒合中",
    care: "公益核實",
    careTitle: "公益活動參與",
    careDetail: "確認是否完成參與",
    share: "企業共享",
    enterprise: "企業",
    match: "Network 媒合",
    matchTitle: "媒合回應",
    matchDetail: "回應／補件／媒合完成",
    case: "需求個案",
    caseDetail: "限制資料，需個案管理權限",
    join: "企業加入",
    joinDetail: "企業加入申請",
    activity: "活動主檔",
    draft: "草稿尚未公開",
    published: "已公開，待開始／進行",
    change: "公開資料變更",
    networkChange: "1% Network 節點變更",
    shareChange: "企業共享變更",
    unpublish: "申請下架",
    edit: "申請修改",
    reward: "共享所核銷",
    rewardTitle: "共享回饋",
    points: "共享點",
  },
  en: {
    signin: "Please sign in with an account that has administrative access.",
    partial:
      "This account does not have full administrative access, or part of the work queue is temporarily unavailable.",
    loading: "Preparing the admin work queue…",
    empty: "There are no items waiting for action.",
    submitted: "Submitted",
    under_review: "Under review",
    needs_info: "Needs information",
    pending: "Pending verification",
    matched: "Matched",
    care: "Care verification",
    careTitle: "Care activity participation",
    careDetail: "Confirm whether participation was completed",
    share: "Organization sharing",
    enterprise: "Organization",
    match: "Network matching",
    matchTitle: "Match response",
    matchDetail: "Response / follow-up / match completion",
    case: "Support case",
    caseDetail: "Restricted data; case-management access required",
    join: "Partner application",
    joinDetail: "Organization partner application",
    activity: "Activity record",
    draft: "Draft, not public",
    published: "Published, upcoming / active",
    change: "Public-data change",
    networkChange: "1% Network node change",
    shareChange: "Organization sharing change",
    unpublish: "Request to unpublish",
    edit: "Request to edit",
    reward: "Reward fulfillment",
    rewardTitle: "Sharing reward",
    points: "Sharing Points",
  },
  ja: {
    signin: "管理権限のあるアカウントでログインしてください。",
    partial:
      "このアカウントには完全な管理権限がないか、一部の作業キューを現在読み込めません。",
    loading: "管理作業キューを整理中…",
    empty: "現在、対応待ちの項目はありません。",
    submitted: "送信済み",
    under_review: "審査中",
    needs_info: "追加情報待ち",
    pending: "確認待ち",
    matched: "マッチ済み",
    care: "公益確認",
    careTitle: "公益活動への参加",
    careDetail: "参加完了を確認",
    share: "企業共有",
    enterprise: "企業",
    match: "Network マッチング",
    matchTitle: "マッチング応答",
    matchDetail: "応答／追加情報／マッチ完了",
    case: "支援案件",
    caseDetail: "制限データ。案件管理権限が必要です",
    join: "企業参加",
    joinDetail: "企業参加申請",
    activity: "活動マスター",
    draft: "下書き・未公開",
    published: "公開済み・開始待ち／進行中",
    change: "公開データ変更",
    networkChange: "1% Network ノード変更",
    shareChange: "企業共有変更",
    unpublish: "非公開申請",
    edit: "変更申請",
    reward: "共有リワード対応",
    rewardTitle: "共有リワード",
    points: "共有ポイント",
  },
  ko: {
    signin: "관리 권한이 있는 계정으로 로그인해 주세요.",
    partial:
      "현재 계정에 전체 관리 권한이 없거나 일부 작업 대기열을 일시적으로 불러올 수 없습니다.",
    loading: "관리 작업 대기열 정리 중…",
    empty: "현재 처리 대기 항목이 없습니다.",
    submitted: "제출됨",
    under_review: "검토 중",
    needs_info: "추가 정보 필요",
    pending: "확인 대기",
    matched: "매칭됨",
    care: "공익 확인",
    careTitle: "공익 활동 참여",
    careDetail: "참여 완료 여부 확인",
    share: "기업 공유",
    enterprise: "기업",
    match: "Network 매칭",
    matchTitle: "매칭 응답",
    matchDetail: "응답 / 보완 / 매칭 완료",
    case: "지원 사례",
    caseDetail: "제한 데이터, 사례 관리 권한 필요",
    join: "기업 참여",
    joinDetail: "기업 참여 신청",
    activity: "활동 마스터",
    draft: "초안, 비공개",
    published: "공개됨, 시작 대기 / 진행 중",
    change: "공개 데이터 변경",
    networkChange: "1% Network 노드 변경",
    shareChange: "기업 공유 변경",
    unpublish: "비공개 신청",
    edit: "수정 신청",
    reward: "공유 리워드 처리",
    rewardTitle: "공유 리워드",
    points: "공유 포인트",
  },
};
export default function LiveAdminQueue() {
  const { locale } = useI18n();
  const c = copy[locale];
  const [loading, setLoading] = useState(true),
    [rows, setRows] = useState<Row[]>([]),
    [notice, setNotice] = useState("");
  useEffect(() => {
    (async () => {
      const s = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await s.auth.getSession();
      if (!session) {
        setNotice(c.signin);
        setLoading(false);
        return;
      }
      const [
        parts,
        shares,
        matches,
        cases,
        applications,
        rewards,
        activities,
        changes,
      ] = await Promise.all([
        s
          .from("activity_participations")
          .select("id,status,created_at,activities(name)")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(30),
        s
          .from("enterprise_shares")
          .select(
            "id,title,status,created_at,enterprises(display_name,legal_name)",
          )
          .in("status", ["submitted", "under_review", "needs_info"])
          .order("created_at", { ascending: true })
          .limit(30),
        s
          .from("network_match_responses")
          .select("id,status,created_at,admin_note,network_requests(title)")
          .in("status", ["submitted", "under_review", "needs_info", "matched"])
          .order("created_at", { ascending: true })
          .limit(30),
        s
          .from("support_cases")
          .select("id,title,status,created_at")
          .in("status", ["submitted", "under_review", "needs_info"])
          .order("created_at", { ascending: true })
          .limit(30),
        s
          .from("enterprise_applications")
          .select("id,company_name,status,created_at,direction")
          .in("status", ["submitted", "under_review", "needs_info"])
          .order("created_at", { ascending: true })
          .limit(30),
        s
          .from("reward_redemptions")
          .select("id,status,created_at,point_cost,reward_catalog(title)")
          .in("status", ["submitted", "approved"])
          .order("created_at", { ascending: true })
          .limit(30),
        s
          .from("activities")
          .select("id,name,status,created_at,starts_at")
          .in("status", ["draft", "published"])
          .order("created_at", { ascending: true })
          .limit(30),
        s
          .from("record_change_requests")
          .select("id,subject_type,request_action,status,created_at")
          .in("status", ["submitted", "under_review", "needs_info"])
          .order("created_at", { ascending: true })
          .limit(30),
      ]);
      if (
        [
          parts,
          shares,
          matches,
          cases,
          applications,
          rewards,
          activities,
          changes,
        ].some((x) => x.error)
      )
        setNotice(c.partial);
      const all: Row[] = [];
      for (const x of parts.data || [])
        all.push({
          kind: c.care,
          id: x.id,
          title: (x as any).activities?.name || c.careTitle,
          status: x.status,
          created_at: x.created_at,
          href: "/admin/verification",
          detail: c.careDetail,
        });
      for (const x of shares.data || [])
        all.push({
          kind: c.share,
          id: x.id,
          title: x.title,
          status: x.status,
          created_at: x.created_at,
          href: "/admin/partners",
          detail:
            (x as any).enterprises?.display_name ||
            (x as any).enterprises?.legal_name ||
            c.enterprise,
        });
      for (const x of matches.data || [])
        all.push({
          kind: c.match,
          id: x.id,
          title: (x as any).network_requests?.title || c.matchTitle,
          status: x.status,
          created_at: x.created_at,
          href: "/admin/network",
          detail: c.matchDetail,
        });
      for (const x of cases.data || [])
        all.push({
          kind: c.case,
          id: x.id,
          title: x.title,
          status: x.status,
          created_at: x.created_at,
          href: "/admin/cases",
          detail: c.caseDetail,
        });
      for (const x of applications.data || [])
        all.push({
          kind: c.join,
          id: x.id,
          title: x.company_name,
          status: x.status,
          created_at: x.created_at,
          href: "/admin/partners",
          detail: x.direction || c.joinDetail,
        });
      for (const x of activities.data || [])
        all.push({
          kind: c.activity,
          id: x.id,
          title: x.name,
          status: x.status,
          created_at: x.created_at,
          href: "/admin/activities",
          detail: x.status === "draft" ? c.draft : c.published,
        });
      for (const x of changes.data || [])
        all.push({
          kind: c.change,
          id: x.id,
          title:
            x.subject_type === "network_profile"
              ? c.networkChange
              : c.shareChange,
          status: x.status,
          created_at: x.created_at,
          href: "/admin/change-requests",
          detail: x.request_action === "unpublish" ? c.unpublish : c.edit,
        });
      for (const x of rewards.data || [])
        all.push({
          kind: c.reward,
          id: x.id,
          title: (x as any).reward_catalog?.title || c.rewardTitle,
          status: x.status,
          created_at: x.created_at,
          href: "/admin/rewards",
          detail: `${x.point_cost} ${c.points}`,
        });
      all.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      setRows(all);
      setLoading(false);
    })();
  }, [locale]);
  const label: Record<string, string> = {
    submitted: c.submitted,
    under_review: c.under_review,
    needs_info: c.needs_info,
    pending: c.pending,
    matched: c.matched,
  };
  if (loading) return <div className="liveAccountLoading">{c.loading}</div>;
  return (
    <>
      {notice && <div className="workflowNotice">{notice}</div>}
      <div className="adminQueue">
        {rows.length ? (
          rows.map((r) => (
            <Link
              href={r.href}
              key={`${r.kind}-${r.id}`}
              className="adminQueueRow"
            >
              <div>
                <small>{r.kind}</small>
                <strong>{r.title}</strong>
                <span>{r.detail}</span>
              </div>
              <div>
                <b>{label[r.status] || r.status}</b>
                <time>{new Date(r.created_at).toLocaleDateString(locale)}</time>
              </div>
            </Link>
          ))
        ) : (
          <div className="emptyData">{c.empty}</div>
        )}
      </div>
    </>
  );
}
