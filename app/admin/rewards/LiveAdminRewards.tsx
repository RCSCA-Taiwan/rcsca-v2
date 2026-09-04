"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type R = {
  id: string;
  point_cost: number;
  status: string;
  created_at: string;
  redemption_code: string | null;
  profiles: { display_name: string | null; email: string | null } | null;
  reward_catalog: { title: string; stock_remaining: number | null } | null;
};
export default function LiveAdminRewards() {
  const [rows, setRows] = useState<R[]>([]),
    [notice, setNotice] = useState(""),
    [busyId, setBusyId] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const { data, error } = await s
      .from("reward_redemptions")
      .select(
        "id,point_cost,status,created_at,redemption_code,profiles(display_name,email),reward_catalog(title,stock_remaining)",
      )
      .in("status", ["submitted", "approved"])
      .order("created_at", { ascending: true });
    if (error) setNotice("目前帳號沒有共享所核銷權限。");
    else setRows((data || []) as any);
  }
  useEffect(() => {
    load();
  }, []);
  async function act(id: string, d: "approved" | "rejected" | "completed") {
    if (busyId) return;
    const label =
      d === "approved"
        ? "核准此兌換並立即扣除共享點與庫存"
        : d === "rejected"
          ? "駁回此兌換"
          : "將此兌換標記為已完成";
    if (!window.confirm(`確定要${label}嗎？`)) return;
    setBusyId(id);
    setNotice("正在處理，請勿關閉頁面。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_review_reward_redemption", {
      p_redemption_id: id,
      p_decision: d,
      p_note: undefined,
    });
    setNotice(
      error
        ? "操作未完成，請確認核銷權限、兌換狀態與庫存後再試。"
        : d === "approved"
          ? "已核准：點數與庫存已由同一受控流程結算。"
          : d === "completed"
            ? "已完成核銷。"
            : "已駁回，沒有扣除共享點。",
    );
    if (!error) await load();
    setBusyId("");
  }
  return (
    <>
      {notice && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      <div className="partnerReviewList">
        {rows.length ? (
          rows.map((r) => (
            <article key={r.id}>
              <div className="partnerReviewMain">
                <small>
                  {r.status === "submitted" ? "待審核" : "已核准待核銷"} ·{" "}
                  {r.point_cost} 共享點
                </small>
                <h3>{r.reward_catalog?.title || "共享回饋"}</h3>
                <p>
                  {r.profiles?.display_name || r.profiles?.email || "會員"}
                  {r.redemption_code ? ` · 兌換碼 ${r.redemption_code}` : ""}
                </p>
              </div>
              <div className="reviewActions">
                {r.status === "submitted" ? (
                  <>
                    <button
                      disabled={!!busyId}
                      onClick={() => act(r.id, "approved")}
                    >
                      {busyId === r.id ? "處理中…" : "核准並扣點"}
                    </button>
                    <button
                      disabled={!!busyId}
                      className="dangerAction"
                      onClick={() => act(r.id, "rejected")}
                    >
                      駁回
                    </button>
                  </>
                ) : (
                  <button
                    disabled={!!busyId}
                    onClick={() => act(r.id, "completed")}
                  >
                    {busyId === r.id ? "處理中…" : "完成核銷"}
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="emptyData">目前沒有待處理兌換。</div>
        )}
      </div>
    </>
  );
}
