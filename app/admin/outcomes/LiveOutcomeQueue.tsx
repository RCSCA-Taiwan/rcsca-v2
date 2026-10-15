"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import OutcomeSource, { loadEnterpriseSources, sourceUnavailable, type EnterpriseSources } from "./OutcomeSource";
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
  const [sources, setSources] = useState<EnterpriseSources>({});
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setLoadError("目前無法連線至資料服務，清單未更新。");
      return;
    }
    const { data, error } = await sb
      .from("outcome_review_queue")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError("成果清單讀取失敗，請檢查連線或後台權限。");
      return;
    }
    const nextRows = (data || []) as Row[];
    const nextSources = await loadEnterpriseSources(sb, nextRows);
    setRows(nextRows);
    setSources(nextSources);
    } catch {
      setLoadError("成果清單讀取失敗，請稍後重試。");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
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
    try {
    const { error } = await sb.rpc("admin_generate_outcome_drafts", {
      p_queue_id: id,
    });
    if (error) {
      setMsg("建立草稿失敗，請檢查連線、權限或成果狀態。");
      return;
    }
    setMsg("已建立草稿；公開前仍需人工確認、同意與審核。");
    window.dispatchEvent(new Event("rcsca:outcome-drafts-changed"));
    await load();
    } catch {
      setMsg("建立草稿操作發生連線錯誤，請重新讀取狀態後再確認結果，勿立即重複建立。");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="panel">
      <div className="section-head">
        <h2>待整理成果</h2>
        <span>{loading ? "讀取中…" : loadError ? "讀取失敗" : `${rows.length} 筆`}</span>
      </div>
      {msg && (
        <p role="status" aria-live="polite">
          {msg}
        </p>
      )}
      {loadError && <p role="alert">{loadError}</p>}
      {!loading && !loadError && rows.length === 0 && (
        <p className="muted">
          目前沒有待整理成果。完成的行動會先進入這裡，再決定是否形成公開案例或企業素材。
        </p>
      )}
      <div className="grid">
        {rows.map((r) => (
          <article className="card" key={r.id}>
            <OutcomeSource origin={r} sources={sources} />
            <p>
              善循環案例：{r.proposed_story ? "建議整理" : "否"} · ESG 素材：
              {r.proposed_esg_asset ? "建議整理" : "否"}
            </p>
            <p className="muted">狀態：{r.status}</p>
            {r.review_note && <p>{r.review_note}</p>}
            <button
              className="button"
              disabled={!!busy || loading || !!loadError || sourceUnavailable(r, sources) || r.status === "under_review"}
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
