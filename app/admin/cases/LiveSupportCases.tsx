"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import type { Database } from "../../../lib/database.types";
type ReviewStatus = Database["public"]["Enums"]["review_status"];
const labels: Record<string, string> = {
  submitted: "已送出",
  under_review: "評估中",
  needs_info: "需要補充",
  approved: "已核准",
  matched: "資源媒合中",
  completed: "已完成",
  rejected: "未承接",
  cancelled: "已取消",
};
export default function LiveSupportCases() {
  const [rows, setRows] = useState<any[]>([]),
    [events, setEvents] = useState<Record<string, any[]>>({}),
    [draft, setDraft] = useState<
      Record<string, { status: ReviewStatus; owner: string; internal: string }>
    >({}),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const { data, error } = await s
      .from("support_cases")
      .select(
        "id,owner_user_id,title,public_summary,private_detail,status,assigned_to,created_at,updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) {
      setNotice("目前帳號沒有個案管理權限。");
      setLoading(false);
      return;
    }
    const list = data || [];
    setRows(list);
    setDraft(
      Object.fromEntries(
        list.map((r: any) => [
          r.id,
          { status: r.status, owner: "", internal: "" },
        ]),
      ),
    );
    if (list.length) {
      const { data: ev } = await s
        .from("support_case_events")
        .select("*")
        .in(
          "case_id",
          list.map((r: any) => r.id),
        )
        .order("created_at", { ascending: true });
      const g: Record<string, any[]> = {};
      (ev || []).forEach((e: any) => (g[e.case_id] ||= []).push(e));
      setEvents(g);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);
  async function save(id: string) {
    if (busy) return;
    const d = draft[id];
    if (!d) return;
    if (
      !window.confirm(`確定將案件更新為「${labels[d.status] || d.status}」嗎？`)
    )
      return;
    setBusy(id);
    setNotice("正在更新案件。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_update_support_case", {
      p_case_id: id,
      p_status: d.status,
      p_owner_note: d.owner,
      p_internal_note: d.internal,
      p_assigned_to: undefined,
    });
    setNotice(
      error ? "更新失敗，請確認權限與欄位。" : "案件已更新並留下歷程。",
    );
    if (!error) await load();
    setBusy("");
  }
  if (loading) return <p>正在讀取受保護案件…</p>;
  return (
    <>
      {notice && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      <div className="stateList">
        {rows.length ? (
          rows.map((r) => {
            const d = draft[r.id] || {
              status: r.status,
              owner: "",
              internal: "",
            };
            return (
              <article className="caseCard" key={r.id}>
                <div className="stateMeta">
                  <small>需求案件</small>
                  <span>{r.id.slice(0, 8)}</span>
                </div>
                <h3>{r.title}</h3>
                <div className="stateRow">
                  <span className={`statusChip status-${r.status}`}>
                    {labels[r.status] || r.status}
                  </span>
                  <span>
                    {new Date(r.updated_at).toLocaleDateString("zh-TW")}
                  </span>
                </div>
                <p>
                  <strong>公開摘要：</strong>
                  {r.public_summary || "—"}
                </p>
                <details>
                  <summary>查看限制資料</summary>
                  <pre className="restrictedDetail">
                    {r.private_detail || "未提供"}
                  </pre>
                </details>
                <div className="caseTimeline">
                  <h4>案件歷程</h4>
                  {(events[r.id] || []).map((e: any) => (
                    <div className="timelineItem" key={e.id}>
                      <span>
                        {new Date(e.created_at).toLocaleDateString("zh-TW")}
                      </span>
                      <div>
                        <strong>
                          {e.visible_to_owner ? "對本人可見" : "內部紀錄"} ·{" "}
                          {e.event_type}
                        </strong>
                        {e.note && <p>{e.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="adminCaseEditor">
                  <label>
                    案件狀態
                    <select
                      value={d.status}
                      onChange={(e) =>
                        setDraft((v) => ({
                          ...v,
                          [r.id]: { ...d, status: e.target.value },
                        }))
                      }
                    >
                      {Object.entries(labels).map(([k, v]) => (
                        <option value={k} key={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    給使用者看的回覆
                    <textarea
                      value={d.owner}
                      onChange={(e) =>
                        setDraft((v) => ({
                          ...v,
                          [r.id]: { ...d, owner: e.target.value },
                        }))
                      }
                      placeholder="例如：資料已收到，目前正在媒合可提供協助的資源。"
                    />
                  </label>
                  <label>
                    內部工作筆記
                    <textarea
                      value={d.internal}
                      onChange={(e) =>
                        setDraft((v) => ({
                          ...v,
                          [r.id]: { ...d, internal: e.target.value },
                        }))
                      }
                      placeholder="僅具個案權限的承辦可見"
                    />
                  </label>
                  <button disabled={!!busy} onClick={() => save(r.id)}>
                    {busy === r.id ? "更新中…" : "更新案件"}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="emptyData">目前沒有需求案件。</div>
        )}
      </div>
    </>
  );
}
