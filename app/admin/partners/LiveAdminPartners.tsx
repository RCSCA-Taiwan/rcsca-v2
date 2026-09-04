"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type Share = {
  id: string;
  title: string;
  share_type: string;
  description: string | null;
  status: string;
  public_result: boolean;
  enterprise_id: string;
  enterprises: { display_name: string | null; legal_name: string } | null;
};
const shareLabel: Record<string, string> = {
  care: "公益關懷",
  connection: "資源連結",
  benefit: "會員禮遇",
  job: "工作機會",
  professional: "專業共享",
  resource: "資源共享",
};
export default function LiveAdminPartners() {
  const [loading, setLoading] = useState(true),
    [rows, setRows] = useState<Share[]>([]),
    [notice, setNotice] = useState(""),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await s.auth.getSession();
    if (!session) {
      setNotice("請先使用具管理權限的帳號登入。");
      setLoading(false);
      return;
    }
    const { data, error } = await s
      .from("enterprise_shares")
      .select(
        "id,title,share_type,description,status,public_result,enterprise_id,enterprises(display_name,legal_name)",
      )
      .in("status", ["submitted", "under_review", "needs_info"])
      .order("created_at", { ascending: true });
    if (error) {
      setNotice("目前帳號沒有企業共享審核權限，或資料讀取失敗。");
      setRows([]);
    } else setRows((data || []) as any);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);
  async function review(
    id: string,
    decision: "approved" | "needs_info" | "rejected",
    publish = false,
  ) {
    if (busy) return;
    const action =
      decision === "approved"
        ? publish
          ? "核准並公開此企業共享內容"
          : "核准但不公開此企業共享內容"
        : decision === "rejected"
          ? "判定此內容未通過"
          : "要求企業補充資料";
    if (!window.confirm(`確定要${action}嗎？`)) return;
    setBusy(id);
    setNotice("正在更新企業共享審核狀態。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_review_enterprise_share", {
      p_share_id: id,
      p_decision: decision,
      p_public_result: publish,
      p_note: notes[id] || undefined,
    });
    if (error) {
      setNotice("操作未完成：目前帳號可能沒有企業共享審核權限。");
      setBusy("");
      return;
    }
    setNotice(
      decision === "approved"
        ? "已完成企業共享審核。"
        : "審核狀態已更新，企業端會收到通知。",
    );
    await load();
    setBusy("");
  }
  if (loading)
    return <div className="liveAccountLoading">正在讀取企業共享審核佇列…</div>;
  return (
    <>
      {notice && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      <div className="partnerReviewList">
        {rows.length ? (
          rows.map((x) => (
            <article key={x.id}>
              <div className="partnerReviewMain">
                <small>
                  {x.enterprises?.display_name ||
                    x.enterprises?.legal_name ||
                    "企業"}{" "}
                  · {shareLabel[x.share_type] || x.share_type}
                </small>
                <h3>{x.title}</h3>
                <p>{x.description || "沒有補充說明"}</p>
                <textarea
                  value={notes[x.id] || ""}
                  onChange={(e) =>
                    setNotes((v) => ({ ...v, [x.id]: e.target.value }))
                  }
                  placeholder="給企業的審核說明（選填）"
                />
              </div>
              <div className="reviewActions">
                <button
                  disabled={!!busy}
                  onClick={() => review(x.id, "approved", false)}
                >
                  {busy === x.id ? "處理中…" : "核准但不公開"}
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => review(x.id, "approved", true)}
                >
                  核准並公開
                </button>
                <button
                  className="secondaryAction"
                  disabled={!!busy}
                  onClick={() => review(x.id, "needs_info")}
                >
                  請補資料
                </button>
                <button
                  className="dangerAction"
                  disabled={!!busy}
                  onClick={() => review(x.id, "rejected")}
                >
                  未通過
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="emptyData">
            目前沒有待審核的企業共享內容，或此帳號無權查看。
          </div>
        )}
      </div>
    </>
  );
}
