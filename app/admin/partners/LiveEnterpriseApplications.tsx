"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type A = {
  id: string;
  company_name: string;
  tax_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  region: string | null;
  share_options: string[];
  direction: string | null;
  status: string;
  created_at: string;
};
export default function LiveEnterpriseApplications() {
  const [rows, setRows] = useState<A[]>([]),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const { data, error } = await s
      .from("enterprise_applications")
      .select(
        "id,company_name,tax_id,contact_name,contact_email,contact_phone,region,share_options,direction,status,created_at",
      )
      .in("status", ["submitted", "under_review", "needs_info"])
      .order("created_at", { ascending: true });
    if (error) setNotice("目前帳號沒有企業申請審核權限。");
    else setRows((data || []) as A[]);
  }
  useEffect(() => {
    load();
  }, []);
  async function act(
    id: string,
    decision: "approved" | "needs_info" | "rejected",
  ) {
    if (busy) return;
    const action =
      decision === "approved"
        ? "核准此企業身份"
        : decision === "rejected"
          ? "判定此申請未通過"
          : "要求申請人補充資料";
    if (!window.confirm(`確定要${action}嗎？`)) return;
    setBusy(id);
    setNotice("正在更新企業申請狀態。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_review_enterprise_application", {
      p_application_id: id,
      p_decision: decision,
      p_note: notes[id] || undefined,
    });
    setNotice(
      error
        ? "操作未完成，請確認管理權限或申請資料。"
        : decision === "approved"
          ? "企業已核准，申請帳號已連結企業身份。"
          : "申請狀態已更新並通知申請人。",
    );
    if (!error) await load();
    setBusy("");
  }
  return (
    <section className="adminWorkBlock">
      <div className="sectionHead compact">
        <div>
          <div className="eyebrow">企業加入申請</div>
          <h2>先完成企業身份，再進入共享與 ESG 工作流。</h2>
        </div>
      </div>
      {notice && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      <div className="partnerReviewList">
        {rows.length ? (
          rows.map((a) => (
            <article key={a.id}>
              <div className="partnerReviewMain">
                <small>
                  {a.region || "未填地區"} · 統編 {a.tax_id}
                </small>
                <h3>{a.company_name}</h3>
                <p>
                  聯絡人：{a.contact_name} · {a.contact_email}
                  {a.contact_phone ? ` · ${a.contact_phone}` : ""}
                </p>
                <p>
                  可共享：
                  {a.share_options?.length
                    ? a.share_options.join("、")
                    : "尚未選擇"}
                  {a.direction ? `｜合作方向：${a.direction}` : ""}
                </p>
                <textarea
                  value={notes[a.id] || ""}
                  onChange={(e) =>
                    setNotes((v) => ({ ...v, [a.id]: e.target.value }))
                  }
                  placeholder="審核說明／需補資料"
                />
              </div>
              <div className="reviewActions">
                <button disabled={!!busy} onClick={() => act(a.id, "approved")}>
                  {busy === a.id ? "處理中…" : "核准企業身份"}
                </button>
                <button
                  className="secondaryAction"
                  disabled={!!busy}
                  onClick={() => act(a.id, "needs_info")}
                >
                  請補資料
                </button>
                <button
                  className="dangerAction"
                  disabled={!!busy}
                  onClick={() => act(a.id, "rejected")}
                >
                  未通過
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="emptyData">目前沒有待審企業加入申請。</div>
        )}
      </div>
    </section>
  );
}
