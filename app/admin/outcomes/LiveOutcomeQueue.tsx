"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type Row = {
  id: string;
  source_type: string;
  source_id: string;
  proposed_story: boolean;
  proposed_esg_asset: boolean;
  status: string;
  review_note: string | null;
  created_at: string;
};
export default function LiveOutcomeQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setMsg("目前無法連線至資料服務。");
      return;
    }
    const { data, error } = await sb
      .from("outcome_review_queue")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setMsg("需要具備 RCSCA 後台權限才能查看。");
      return;
    }
    setMsg("");
    setRows((data || []) as Row[]);
  }
  useEffect(() => {
    load();
  }, []);
  async function makeDrafts(id: string) {
    if (
      busy ||
      !window.confirm("確定從這筆成果建立草稿嗎？草稿仍須人工審核後才能公開。")
    )
      return;
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    setBusy(id);
    setMsg("正在建立成果草稿。");
    const { error } = await sb.rpc("admin_generate_outcome_drafts", {
      p_queue_id: id,
    });
    setBusy(null);
    if (error) {
      setMsg("建立草稿失敗：請確認後台權限。");
      return;
    }
    setMsg("已建立草稿；公開前仍需人工確認、同意與審核。");
    await load();
  }
  return (
    <section className="panel">
      <div className="section-head">
        <h2>待整理成果</h2>
        <span>{rows.length} 筆</span>
      </div>
      {msg && (
        <p role="status" aria-live="polite">
          {msg}
        </p>
      )}
      {!msg && rows.length === 0 && (
        <p className="muted">
          目前沒有待整理成果。完成的行動會先進入這裡，再決定是否形成公開案例或企業素材。
        </p>
      )}
      <div className="grid">
        {rows.map((r) => (
          <article className="card" key={r.id}>
            <strong>{r.source_type}</strong>
            <p>
              善循環案例：{r.proposed_story ? "建議整理" : "否"} · ESG 素材：
              {r.proposed_esg_asset ? "建議整理" : "否"}
            </p>
            <p className="muted">狀態：{r.status}</p>
            {r.review_note && <p>{r.review_note}</p>}
            <button
              className="button"
              disabled={!!busy || r.status === "under_review"}
              onClick={() => makeDrafts(r.id)}
            >
              {busy === r.id
                ? "建立中…"
                : r.status === "under_review"
                  ? "草稿已建立"
                  : "建立成果草稿"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
