"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import { useI18n, type Locale } from "../../i18n";
type A = {
  id: number;
  actor_user_id: string | null;
  action: string;
  actor_role: string | null;
  subject_type: string;
  subject_id: string | null;
  created_at: string;
  note: string | null;
};
const copy: Record<Locale, any> = {
  "zh-Hant": {
    signin: "請先使用管理帳號登入。",
    denied: "目前帳號沒有 Audit Log 權限。",
    loading: "正在讀取操作紀錄…",
    none: "目前沒有可顯示的操作紀錄。",
    note: "未附註說明",
    search: "搜尋操作、對象或備註",
    refresh: "重新整理",
    refreshing: "整理中…",
    count: "筆符合",
    actor: "操作者",
  },
  en: {
    signin: "Sign in with an admin account first.",
    denied: "This account does not have Audit Log access.",
    loading: "Loading activity log…",
    none: "No activity log entries to display.",
    note: "No note provided",
    search: "Search action, subject, or note",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    count: "matching",
    actor: "Actor",
  },
  ja: {
    signin: "管理者アカウントでログインしてください。",
    denied: "このアカウントには Audit Log の閲覧権限がありません。",
    loading: "操作履歴を読み込み中…",
    none: "表示できる操作履歴はありません。",
    note: "注記なし",
    search: "操作・対象・注記を検索",
    refresh: "再読み込み",
    refreshing: "更新中…",
    count: "件",
    actor: "操作者",
  },
  ko: {
    signin: "관리자 계정으로 먼저 로그인하세요.",
    denied: "이 계정에는 Audit Log 권한이 없습니다.",
    loading: "작업 기록을 불러오는 중…",
    none: "표시할 작업 기록이 없습니다.",
    note: "메모 없음",
    search: "작업, 대상 또는 메모 검색",
    refresh: "새로고침",
    refreshing: "새로고침 중…",
    count: "건 일치",
    actor: "작업자",
  },
};
export default function LiveAuditLog() {
  const { locale } = useI18n();
  const c = copy[locale];
  const [rows, setRows] = useState<A[]>([]),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [refreshing, setRefreshing] = useState(false);
  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
      const s = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await s.auth.getSession();
      if (!session) {
        setNotice(c.signin);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const { data, error } = await s
        .from("audit_logs")
        .select("id,actor_user_id,action,actor_role,subject_type,subject_id,created_at,note")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) setNotice(c.denied);
      else setRows((data || []) as A[]);
      setLoading(false);
      setRefreshing(false);
  }
  useEffect(() => {
    load();
  }, [locale]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((x) =>
      [x.action, x.actor_role, x.actor_user_id, x.subject_type, x.subject_id, x.note]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, query]);
  if (loading) return <div className="liveAccountLoading">{c.loading}</div>;
  return (
    <>
      {notice && <div className="workflowNotice" role="status" aria-live="polite">{notice}</div>}
      <div className="adminActions">
        <input
          className="directorySearch"
          aria-label={c.search}
          placeholder={c.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button disabled={refreshing} onClick={() => load(true)}>
          {refreshing ? c.refreshing : c.refresh}
        </button>
        <span aria-live="polite">{shown.length} {c.count}</span>
      </div>
      <div className="auditList">
        {shown.length ? (
          shown.map((x) => (
            <article key={x.id}>
              <div>
                <strong>{x.action}</strong>
                <small>
                  {x.actor_role || "system"} ·{" "}
                  {new Date(x.created_at).toLocaleString(locale)}
                </small>
                <small>
                  {c.actor}：{x.actor_user_id ? x.actor_user_id.slice(0, 8) : "system"}
                </small>
              </div>
              <p>
                {x.subject_type} / {x.subject_id || "—"}
              </p>
              <span>{x.note || c.note}</span>
            </article>
          ))
        ) : (
          <div className="emptyData">{c.none}</div>
        )}
      </div>
    </>
  );
}
