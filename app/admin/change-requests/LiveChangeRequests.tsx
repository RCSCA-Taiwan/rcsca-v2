"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import { useI18n, type Locale } from "../../i18n";
type Row = {
  id: string;
  subject_type: string;
  subject_id: string;
  request_action: string;
  proposed_changes: any;
  requester_note: string | null;
  status: string;
  created_at: string;
};
const copy: Record<Locale, any> = {
  "zh-Hant": {
    denied: "目前帳號沒有公開資料變更審核權限。",
    failed: "操作未完成，請確認權限與資料狀態。",
    updated: "變更申請狀態已更新。",
    network: "1% Network 節點",
    share: "企業共享",
    profile: "企業基本資料",
    unpublish: "申請下架",
    update: "申請修改",
    note: "給申請人的審核說明（選填）",
    approve: "核准變更",
    info: "請補資料",
    reject: "未通過",
    confirm: "確定更新這筆公開資料變更申請嗎？",
    empty: "目前沒有待處理的公開資料變更申請。",
  },
  en: {
    denied:
      "This account does not have permission to review public-data changes.",
    failed:
      "Action could not be completed. Check permissions and record status.",
    updated: "The change-request status has been updated.",
    network: "1% Network node",
    share: "Enterprise sharing",
    profile: "Enterprise profile",
    unpublish: "Unpublish request",
    update: "Change request",
    note: "Review note for the requester (optional)",
    approve: "Approve change",
    info: "Request more information",
    reject: "Reject",
    confirm: "Update this public-data change request?",
    empty: "There are no public-data change requests awaiting review.",
  },
  ja: {
    denied: "このアカウントには公開データ変更の審査権限がありません。",
    failed: "操作を完了できません。権限とデータ状態を確認してください。",
    updated: "変更申請の状態を更新しました。",
    network: "1% Network ノード",
    share: "企業の共有",
    profile: "企業基本情報",
    unpublish: "公開停止申請",
    update: "変更申請",
    note: "申請者への審査メモ（任意）",
    approve: "変更を承認",
    info: "追加情報を依頼",
    reject: "却下",
    confirm: "この公開データ変更申請を更新しますか？",
    empty: "現在、審査待ちの公開データ変更申請はありません。",
  },
  ko: {
    denied: "현재 계정에 공개 데이터 변경 검토 권한이 없습니다.",
    failed: "작업을 완료하지 못했습니다. 권한과 데이터 상태를 확인해 주세요.",
    updated: "변경 요청 상태를 업데이트했습니다.",
    network: "1% Network 노드",
    share: "기업 공유",
    profile: "기업 기본 정보",
    unpublish: "게시 중단 요청",
    update: "변경 요청",
    note: "신청자에게 전달할 검토 메모(선택)",
    approve: "변경 승인",
    info: "추가 정보 요청",
    reject: "거절",
    confirm: "이 공개 데이터 변경 요청을 업데이트할까요?",
    empty: "현재 검토 대기 중인 공개 데이터 변경 요청이 없습니다.",
  },
};
export default function LiveChangeRequests() {
  const { locale } = useI18n();
  const c = copy[locale];
  const [rows, setRows] = useState<Row[]>([]),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState("");
  const subjectLabel: Record<string, string> = {
    network_profile: c.network,
    enterprise_share: c.share,
    enterprise_profile: c.profile,
  };
  async function load() {
    const s = getSupabaseBrowserClient();
    const { data, error } = await s
      .from("record_change_requests")
      .select(
        "id,subject_type,subject_id,request_action,proposed_changes,requester_note,status,created_at",
      )
      .in("status", ["submitted", "under_review", "needs_info"])
      .order("created_at", { ascending: true });
    if (error) setMsg(c.denied);
    else setRows((data || []) as Row[]);
  }
  useEffect(() => {
    load();
  }, [locale]);
  async function review(id: string, d: string) {
    if (busy || !window.confirm(c.confirm)) return;
    setBusy(id);
    setMsg(c.updated);
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_review_record_change", {
      p_request_id: id,
      p_decision: d,
      p_reviewer_note: notes[id] || undefined,
    });
    setMsg(error ? c.failed : c.updated);
    if (!error) await load();
    setBusy("");
  }
  return (
    <>
      {msg && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {msg}
        </div>
      )}
      <div className="partnerReviewList">
        {rows.length ? (
          rows.map((r) => (
            <article key={r.id}>
              <div className="partnerReviewMain">
                <small>
                  {subjectLabel[r.subject_type] || r.subject_type} ·{" "}
                  {r.request_action === "unpublish" ? c.unpublish : c.update}
                </small>
                <h3>{r.subject_id}</h3>
                {r.requester_note && <p>{r.requester_note}</p>}
                {r.request_action === "update" && (
                  <div className="changePreview">
                    {Object.entries(r.proposed_changes || {})
                      .filter(([, v]) => v !== null && v !== "")
                      .map(([k, v]) => (
                        <p key={k}>
                          <b>{k}</b>：{String(v)}
                        </p>
                      ))}
                  </div>
                )}
                <textarea
                  placeholder={c.note}
                  value={notes[r.id] || ""}
                  onChange={(e) =>
                    setNotes((v) => ({ ...v, [r.id]: e.target.value }))
                  }
                />
              </div>
              <div className="reviewActions">
                <button
                  disabled={!!busy}
                  onClick={() => review(r.id, "approved")}
                >
                  {busy === r.id ? "…" : c.approve}
                </button>
                <button
                  className="secondaryAction"
                  disabled={!!busy}
                  onClick={() => review(r.id, "needs_info")}
                >
                  {c.info}
                </button>
                <button
                  className="dangerAction"
                  disabled={!!busy}
                  onClick={() => review(r.id, "rejected")}
                >
                  {c.reject}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="emptyData">{c.empty}</div>
        )}
      </div>
    </>
  );
}
