"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type Row = {
  id: string;
  message: string;
  status: string;
  admin_note: string | null;
  network_requests: { title: string } | null;
};
export default function LiveAdminNetwork() {
  const [rows, setRows] = useState<Row[]>([]),
    [note, setNote] = useState<Record<string, string>>({}),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const { data, error } = await s
      .from("network_match_responses")
      .select("id,message,status,admin_note,network_requests(title)")
      .in("status", ["submitted", "under_review", "needs_info", "approved"])
      .order("created_at", { ascending: true });
    if (error) setMsg("目前帳號沒有媒合管理權限。");
    else setRows((data || []) as any);
  }
  useEffect(() => {
    load();
  }, []);
  async function act(id: string, d: string) {
    if (busy) return;
    const labels: Record<string, string> = {
      approved: "確認此媒合",
      needs_info: "要求補充資料",
      completed: "將媒合標記為完成",
      rejected: "判定此媒合不適合",
    };
    if (!window.confirm(`確定要${labels[d] || "更新媒合狀態"}嗎？`)) return;
    setBusy(id);
    setMsg("正在更新媒合狀態。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_review_network_response", {
      p_response_id: id,
      p_decision: d,
      p_note: note[id] || undefined,
    });
    setMsg(
      error
        ? "操作未完成，請確認管理權限。"
        : "媒合狀態已更新，雙方會收到通知。",
    );
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
                <small>媒合回應 · {r.status}</small>
                <h3>{r.network_requests?.title || "Network 需求"}</h3>
                <p>{r.message}</p>
                <textarea
                  placeholder="管理備註（選填）"
                  value={note[r.id] || ""}
                  onChange={(e) =>
                    setNote((v) => ({ ...v, [r.id]: e.target.value }))
                  }
                />
              </div>
              <div className="reviewActions">
                <button disabled={!!busy} onClick={() => act(r.id, "approved")}>
                  {busy === r.id ? "處理中…" : "確認媒合"}
                </button>
                <button
                  className="secondaryAction"
                  disabled={!!busy}
                  onClick={() => act(r.id, "needs_info")}
                >
                  請補資料
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => act(r.id, "completed")}
                >
                  標記完成
                </button>
                <button
                  className="dangerAction"
                  disabled={!!busy}
                  onClick={() => act(r.id, "rejected")}
                >
                  不適合
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="emptyData">目前沒有待處理媒合。</div>
        )}
      </div>
    </>
  );
}
