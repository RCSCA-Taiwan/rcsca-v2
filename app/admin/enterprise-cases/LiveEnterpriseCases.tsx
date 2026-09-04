"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import type { Database } from "../../../lib/database.types";
import { useI18n, type Locale } from "../../i18n";
type ReviewStatus = Database["public"]["Enums"]["review_status"];
const copy: Record<Locale, any> = {
  "zh-Hant": {
    labels: {
      submitted: "已送出",
      under_review: "評估中",
      needs_info: "待補資料",
      approved: "已確認",
      matched: "執行中",
      completed: "已完成",
      rejected: "未承接",
      cancelled: "已取消",
    },
    mine: "只看我的案件",
    all: "顯示全部案件",
    priority: "優先處理逾期與企業最新補件；案件不以金額排序。",
    overdue: "已逾期 · ",
    reply: "企業最近回覆：",
    service: "服務：",
    next: "下一步：",
    remind: "標記到期提醒已處理",
    review: "進入評估",
    info: "請補資料",
    approve: "確認合作",
    matched: "執行中",
    complete: "完成",
    note: "給企業的進度說明（可留空）",
    nextPrompt: "下一步（可留空）",
    due: "預計日期 YYYY-MM-DD（可留空）",
    remindFail: "提醒標記失敗：請確認管理權限。",
    remindOk: "已標記本次到期提醒處理。",
    updateFail: "更新失敗：請確認管理權限。",
    updateOk: "案件已更新並同步企業端。",
    confirmRemind: "確定將本次到期提醒標記為已處理嗎？",
    confirmUpdate: "確定更新此企業服務案件嗎？",
    invalidDue: "日期格式無效，請使用 YYYY-MM-DD。",
    working: "正在更新案件。",
  },
  en: {
    labels: {
      submitted: "Submitted",
      under_review: "Under review",
      needs_info: "Needs information",
      approved: "Confirmed",
      matched: "In progress",
      completed: "Completed",
      rejected: "Not accepted",
      cancelled: "Cancelled",
    },
    mine: "My cases only",
    all: "Show all cases",
    priority:
      "Prioritize overdue cases and the latest enterprise replies; cases are not ranked by amount.",
    overdue: "Overdue · ",
    reply: "Latest enterprise reply: ",
    service: "Service: ",
    next: "Next step: ",
    remind: "Mark due reminder handled",
    review: "Start review",
    info: "Request information",
    approve: "Confirm collaboration",
    matched: "In progress",
    complete: "Complete",
    note: "Progress note for the enterprise (optional)",
    nextPrompt: "Next step (optional)",
    due: "Target date YYYY-MM-DD (optional)",
    remindFail: "Could not mark reminder. Check admin access.",
    remindOk: "Due reminder marked as handled.",
    updateFail: "Update failed. Check admin access.",
    updateOk: "Case updated and synced to the enterprise portal.",
    confirmRemind: "Mark this due reminder as handled?",
    confirmUpdate: "Update this enterprise service case?",
    invalidDue: "Invalid date. Use YYYY-MM-DD.",
    working: "Updating case.",
  },
  ja: {
    labels: {
      submitted: "送信済み",
      under_review: "審査中",
      needs_info: "追加情報待ち",
      approved: "確認済み",
      matched: "実行中",
      completed: "完了",
      rejected: "不採択",
      cancelled: "取消済み",
    },
    mine: "自分の案件のみ",
    all: "すべての案件を表示",
    priority:
      "期限超過と企業からの最新追記を優先します。金額順には並べません。",
    overdue: "期限超過 · ",
    reply: "企業の最新返信：",
    service: "サービス：",
    next: "次の対応：",
    remind: "期限リマインド対応済みにする",
    review: "審査開始",
    info: "追加情報を依頼",
    approve: "連携を確認",
    matched: "実行中",
    complete: "完了",
    note: "企業向け進捗メモ（任意）",
    nextPrompt: "次の対応（任意）",
    due: "予定日 YYYY-MM-DD（任意）",
    remindFail: "リマインドを更新できません。管理権限を確認してください。",
    remindOk: "期限リマインドを対応済みにしました。",
    updateFail: "更新できません。管理権限を確認してください。",
    updateOk: "案件を更新し企業側にも反映しました。",
    confirmRemind: "この期限リマインドを対応済みにしますか？",
    confirmUpdate: "この企業サービス案件を更新しますか？",
    invalidDue: "日付形式が無効です。YYYY-MM-DD を使用してください。",
    working: "案件を更新しています。",
  },
  ko: {
    labels: {
      submitted: "제출됨",
      under_review: "검토 중",
      needs_info: "추가 자료 필요",
      approved: "확인됨",
      matched: "진행 중",
      completed: "완료",
      rejected: "미수행",
      cancelled: "취소됨",
    },
    mine: "내 담당만 보기",
    all: "전체 사례 보기",
    priority:
      "기한 초과와 기업의 최신 보완 자료를 우선 처리하며 금액순으로 정렬하지 않습니다.",
    overdue: "기한 초과 · ",
    reply: "기업 최근 답변: ",
    service: "서비스: ",
    next: "다음 단계: ",
    remind: "기한 알림 처리 완료 표시",
    review: "검토 시작",
    info: "추가 자료 요청",
    approve: "협력 확인",
    matched: "진행 중",
    complete: "완료",
    note: "기업에 보낼 진행 설명(선택)",
    nextPrompt: "다음 단계(선택)",
    due: "예정일 YYYY-MM-DD(선택)",
    remindFail: "알림 표시 실패. 관리자 권한을 확인하세요.",
    remindOk: "기한 알림을 처리 완료로 표시했습니다.",
    updateFail: "업데이트 실패. 관리자 권한을 확인하세요.",
    updateOk: "사례를 업데이트하고 기업 화면에 동기화했습니다.",
    confirmRemind: "이 기한 알림을 처리 완료로 표시할까요?",
    confirmUpdate: "이 기업 서비스 사례를 업데이트할까요?",
    invalidDue: "날짜 형식이 잘못되었습니다. YYYY-MM-DD를 사용하세요.",
    working: "사례를 업데이트하는 중입니다.",
  },
};
export default function LiveEnterpriseCases() {
  const { locale } = useI18n();
  const c = copy[locale];
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [mine, setMine] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await s.auth.getUser();
    setUid(user?.id || null);
    const { data } = await s
      .from("enterprise_case_workbench")
      .select("*")
      .order("is_overdue", { ascending: false })
      .order("updated_at", { ascending: false });
    setRows(data || []);
  }
  useEffect(() => {
    load();
  }, []);
  const shown = useMemo(
    () => (mine && uid ? rows.filter((r) => r.assigned_to === uid) : rows),
    [rows, mine, uid],
  );
  async function remind(r: any) {
    if (busy || !window.confirm(c.confirmRemind)) return;
    setBusy(r.id);
    setMsg(c.working);
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_mark_case_due_reminder", {
      p_request_id: r.id,
    });
    setMsg(error ? c.remindFail : c.remindOk);
    if (!error) await load();
    setBusy("");
  }
  async function update(r: any, status: ReviewStatus) {
    if (busy) return;
    const rawNote = window.prompt(c.note, "");
    if (rawNote === null) return;
    const rawNext = window.prompt(c.nextPrompt, r.next_action || "");
    if (rawNext === null) return;
    const rawDue = window.prompt(c.due, "");
    if (rawDue === null) return;
    const dueText = rawDue.trim();
    if (
      dueText &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(dueText) ||
        Number.isNaN(new Date(dueText + "T12:00:00+08:00").getTime()))
    ) {
      setMsg(c.invalidDue);
      return;
    }
    if (!window.confirm(c.confirmUpdate)) return;
    const note = rawNote.trim() || undefined;
    const next = rawNext.trim() || undefined;
    const due = dueText
      ? new Date(dueText + "T12:00:00+08:00").toISOString()
      : undefined;
    setBusy(r.id);
    setMsg(c.working);
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_update_enterprise_service_request", {
      p_request_id: r.id,
      p_status: status,
      p_assigned_to: r.assigned_to || uid,
      p_note: note,
      p_next_action: next,
      p_next_action_due_at: due,
      p_visible_to_enterprise: true,
    });
    setMsg(error ? c.updateFail : c.updateOk);
    if (!error) await load();
    setBusy("");
  }
  return (
    <div>
      {msg && (
        <p className="formNote" role="status" aria-live="polite">
          {msg}
        </p>
      )}
      <div className="adminActions">
        <button onClick={() => setMine((v) => !v)}>
          {mine ? c.all : c.mine}
        </button>
      </div>
      <p className="formNote">{c.priority}</p>
      <div className="stateList">
        {shown.map((r) => (
          <article key={r.id}>
            <div className="stateMeta">
              <small>{r.case_number}</small>
              <span>
                {r.is_overdue ? c.overdue : ""}
                {c.labels[r.status] || r.status}
              </span>
            </div>
            <h3>{r.company_name}</h3>
            {r.last_enterprise_reply_at && (
              <p>
                <strong>{c.reply}</strong>
                {new Date(r.last_enterprise_reply_at).toLocaleString(locale)}
              </p>
            )}
            <p>
              <strong>{c.service}</strong>
              {r.service_tier}
            </p>
            {r.next_action && (
              <p>
                <strong>{c.next}</strong>
                {r.next_action}
                {r.next_action_due_at
                  ? ` · ${new Date(r.next_action_due_at).toLocaleDateString(locale)}`
                  : ""}
              </p>
            )}
            <div className="adminActions">
              {r.is_overdue && (
                <button disabled={!!busy} onClick={() => remind(r)}>
                  {busy === r.id ? "…" : c.remind}
                </button>
              )}
              <button
                disabled={!!busy}
                onClick={() => update(r, "under_review")}
              >
                {c.review}
              </button>
              <button disabled={!!busy} onClick={() => update(r, "needs_info")}>
                {c.info}
              </button>
              <button disabled={!!busy} onClick={() => update(r, "approved")}>
                {c.approve}
              </button>
              <button disabled={!!busy} onClick={() => update(r, "matched")}>
                {c.matched}
              </button>
              <button disabled={!!busy} onClick={() => update(r, "completed")}>
                {c.complete}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
