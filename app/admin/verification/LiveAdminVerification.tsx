"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import { useI18n, type Locale } from "../../i18n";
type Row = {
  id: string;
  participation_type: string;
  status: string;
  created_at: string;
  activity_id: string;
  activities: { name: string } | null;
  profiles: { display_name: string | null; email: string | null } | null;
};
const copy: Record<Locale, Record<string, string>> = {
  "zh-Hant": {
    signin: "請先使用具審核權限的帳號登入。",
    denied: "目前帳號沒有活動核實權限，或資料讀取失敗。",
    approveNote: "後台人工核實完成",
    rejectNote: "後台人工駁回",
    failed: "操作未完成：目前帳號可能沒有活動審核權限。",
    approved: "已完成核實並建立共享足跡。",
    rejected: "已駁回這筆參與紀錄。",
    loading: "正在讀取待核實紀錄…",
    activity: "活動／參與者",
    type: "參與方式",
    status: "狀態",
    action: "操作",
    activityName: "活動",
    participant: "參與者",
    pending: "待核實",
    approve: "核實完成",
    reject: "駁回",
    confirmApprove: "確定核實這筆參與紀錄並建立共享足跡嗎？",
    confirmReject: "確定駁回這筆參與紀錄嗎？",
    empty: "目前沒有待核實紀錄，或目前帳號沒有查看此佇列的權限。",
  },
  en: {
    signin: "Please sign in with an account that has review access.",
    denied:
      "This account does not have activity-verification access, or the data could not be loaded.",
    approveNote: "Verified manually in admin",
    rejectNote: "Rejected manually in admin",
    failed:
      "Action could not be completed. This account may not have activity-review access.",
    approved: "Verification completed and a Sharing Footprint was created.",
    rejected: "This participation record was rejected.",
    loading: "Loading records awaiting verification…",
    activity: "Activity / participant",
    type: "Participation type",
    status: "Status",
    action: "Action",
    activityName: "Activity",
    participant: "Participant",
    pending: "Pending verification",
    approve: "Verify complete",
    reject: "Reject",
    confirmApprove: "Verify this participation and create a Sharing Footprint?",
    confirmReject: "Reject this participation record?",
    empty:
      "There are no records awaiting verification, or this account cannot view this queue.",
  },
  ja: {
    signin: "審査権限のあるアカウントでログインしてください。",
    denied:
      "このアカウントには活動確認権限がないか、データを読み込めませんでした。",
    approveNote: "管理画面で本人確認済み",
    rejectNote: "管理画面で却下",
    failed:
      "操作を完了できません。このアカウントには活動審査権限がない可能性があります。",
    approved: "確認が完了し、共有の足跡を作成しました。",
    rejected: "この参加記録を却下しました。",
    loading: "確認待ち記録を読み込み中…",
    activity: "活動／参加者",
    type: "参加方法",
    status: "状態",
    action: "操作",
    activityName: "活動",
    participant: "参加者",
    pending: "確認待ち",
    approve: "完了を確認",
    reject: "却下",
    confirmApprove: "この参加記録を確認し、共有の足跡を作成しますか？",
    confirmReject: "この参加記録を却下しますか？",
    empty:
      "確認待ちの記録がないか、このアカウントにはキュー閲覧権限がありません。",
  },
  ko: {
    signin: "검토 권한이 있는 계정으로 로그인해 주세요.",
    denied: "현재 계정에 활동 확인 권한이 없거나 데이터를 불러오지 못했습니다.",
    approveNote: "관리자 수동 확인 완료",
    rejectNote: "관리자 수동 거절",
    failed:
      "작업을 완료하지 못했습니다. 현재 계정에 활동 검토 권한이 없을 수 있습니다.",
    approved: "확인을 완료하고 공유 발자취를 생성했습니다.",
    rejected: "이 참여 기록을 거절했습니다.",
    loading: "확인 대기 기록 불러오는 중…",
    activity: "활동 / 참여자",
    type: "참여 방식",
    status: "상태",
    action: "작업",
    activityName: "활동",
    participant: "참여자",
    pending: "확인 대기",
    approve: "완료 확인",
    reject: "거절",
    confirmApprove: "이 참여 기록을 확인하고 공유 발자취를 만들까요?",
    confirmReject: "이 참여 기록을 거절할까요?",
    empty:
      "현재 확인 대기 기록이 없거나 이 계정에 대기열 조회 권한이 없습니다.",
  },
};
export default function LiveAdminVerification() {
  const { locale } = useI18n();
  const c = copy[locale];
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await s.auth.getSession();
    if (!session) {
      setNotice(c.signin);
      setLoading(false);
      return;
    }
    const { data, error } = await s
      .from("activity_participations")
      .select(
        "id,participation_type,status,created_at,activity_id,activities(name),profiles(display_name,email)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) {
      setNotice(c.denied);
      setRows([]);
    } else setRows((data || []) as any);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [locale]);
  async function verify(id: string, approved: boolean) {
    if (busy || !window.confirm(approved ? c.confirmApprove : c.confirmReject))
      return;
    setBusy(id);
    setNotice(c.loading);
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_verify_participation", {
      p_participation_id: id,
      p_approved: approved,
      p_note: approved ? c.approveNote : c.rejectNote,
    });
    if (error) {
      setNotice(c.failed);
      setBusy("");
      return;
    }
    setNotice(approved ? c.approved : c.rejected);
    await load();
    setBusy("");
  }
  if (loading) return <div className="liveAccountLoading">{c.loading}</div>;
  return (
    <>
      {notice && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      <div className="verificationTable">
        <div className="vtHead">
          <span>{c.activity}</span>
          <span>{c.type}</span>
          <span>{c.status}</span>
          <span>{c.action}</span>
        </div>
        {rows.length ? (
          rows.map((x) => (
            <div className="vtRow" key={x.id}>
              <span>
                <b>{x.activities?.name || c.activityName}</b>
                <small>
                  {x.profiles?.display_name ||
                    x.profiles?.email ||
                    c.participant}{" "}
                  · {x.id.slice(0, 8)}
                </small>
              </span>
              <span>{x.participation_type}</span>
              <span>
                <i>{c.pending}</i>
              </span>
              <span className="verifyActions">
                <button disabled={!!busy} onClick={() => verify(x.id, true)}>
                  {busy === x.id ? "…" : c.approve}
                </button>
                <button
                  className="secondaryAction"
                  disabled={!!busy}
                  onClick={() => verify(x.id, false)}
                >
                  {c.reject}
                </button>
              </span>
            </div>
          ))
        ) : (
          <div className="emptyData">{c.empty}</div>
        )}
      </div>
    </>
  );
}
