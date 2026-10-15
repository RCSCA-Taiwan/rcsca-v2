"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import OutcomeSource, { loadEnterpriseSources, sourceUnavailable, type EnterpriseSources } from "./OutcomeSource";
import StoryDraftEditor from "./StoryDraftEditor";
type Story = {
  updated_at: string;
  source_type: string | null;
  source_id: string | null;
  id: string;
  title: string;
  summary: string;
  status: string;
  consent_confirmed: boolean;
  anonymized: boolean;
};
type Asset = {
  source_type: string | null;
  source_id: string | null;
  id: string;
  title: string;
  summary: string;
  period_label: string | null;
  status: string;
};
export default function LiveOutcomeDrafts() {
  const [stories, setStories] = useState<Story[]>([]),
    [assets, setAssets] = useState<Asset[]>([]),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState("");
  const [assetEdits, setAssetEdits] = useState<Record<string, Partial<Asset>>>({});
  const [sources, setSources] = useState<EnterpriseSources>({});
  const [editingId, setEditingId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setLoadError("目前無法連線至資料服務，草稿清單未更新。");
      return;
    }
    const [s, a] = await Promise.all([
      sb
        .from("cycle_stories")
        .select("id,title,summary,status,consent_confirmed,anonymized,source_type,source_id,updated_at")
        .in("status", ["draft", "submitted", "needs_info"]),
      sb
        .from("enterprise_esg_assets")
        .select("id,title,summary,period_label,status,source_type,source_id")
        .in("status", ["draft", "submitted", "needs_info"]),
    ]);
    if (s.error || a.error) {
      setLoadError("草稿清單讀取失敗，請檢查連線或後台權限；不代表沒有草稿。");
      return;
    }
    const nextStories = (s.data || []) as Story[];
    const nextAssets = (a.data || []) as Asset[];
    const nextSources = await loadEnterpriseSources(sb, [...nextStories, ...nextAssets]);
    setStories(nextStories);
    setAssets(nextAssets);
    setSources(nextSources);
    } catch {
      setLoadError("草稿清單讀取失敗，請稍後重試；不代表沒有草稿。");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const refresh = () => { void load(); };
    window.addEventListener("rcsca:outcome-drafts-changed", refresh);
    refresh();
    return () => window.removeEventListener("rcsca:outcome-drafts-changed", refresh);
  }, [load]);
  async function publishStory(x: Story) {
    if (busy || editingId || loading || loadError || sourceUnavailable(x, sources)) return;
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    const consent = window.confirm("確認已取得公開同意？沒有同意不得發布。");
    if (!consent) return;
    const anonymized = window.confirm(
      "此案例是否已完成必要匿名化？按「取消」代表不需要匿名化。",
    );
    if (!window.confirm(`確定公開發布「${x.title}」嗎？發布後將對外可見。`))
      return;
    setBusy(x.id);
    setMsg("正在發布善循環案例。");
    const { error } = await sb.rpc("admin_publish_cycle_story", {
      p_story_id: x.id,
      p_title: x.title,
      p_summary: x.summary,
      p_consent: true,
      p_anonymized: anonymized,
      p_note: "後台人工確認發布",
    });
    setMsg(error ? "發布失敗，請確認權限與內容。" : "善循環案例已發布。");
    if (!error) await load();
    setBusy("");
  }
  async function approveAsset(x: Asset) {
    x = { ...x, ...assetEdits[x.id] };
    if (!x.title.trim() || !x.summary.trim()) {
      setMsg("請填寫成果標題與摘要。");
      return;
    }
    if (busy || editingId || !window.confirm(`確定完成「${x.title}」企業 ESG 素材嗎？`))
      return;
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    setBusy(x.id);
    setMsg("正在完成企業 ESG 素材。");
    const { error } = await sb.rpc("admin_approve_esg_asset", {
      p_asset_id: x.id,
      p_title: x.title,
      p_summary: x.summary,
      p_period_label: x.period_label || undefined,
      p_note: "後台人工確認完成",
    });
    setMsg(
      error
        ? "ESG 素材核准失敗，請確認權限與內容狀態。"
        : "ESG 素材已完成，企業端將收到通知。",
    );
    if (!error) await load();
    setBusy("");
  }
  return (
    <section className="panel">
      <div className="section-head">
        <h2>成果草稿審核</h2>
        <span>{loading ? "讀取中…" : loadError ? "讀取失敗" : `${stories.length + assets.length} 筆`}</span>
      </div>
      {msg && (
        <p role="status" aria-live="polite">
          {msg}
        </p>
      )}
      {loadError && <p role="alert">{loadError}</p>}
      {!loading && !loadError && stories.length + assets.length === 0 && (
        <p className="muted">目前沒有待審核的成果草稿。</p>
      )}
      <div className="grid">
        {stories.map((x) => (
          <article className="card" key={x.id}>
            <span className="eyebrow">善循環案例</span>
            <h3>{x.title}</h3>
            <OutcomeSource origin={x} sources={sources} />
            <p>{x.summary}</p>
            {editingId === x.id ? <StoryDraftEditor
              key={x.id}
              story={x}
              disabled={loading || !!loadError || sourceUnavailable(x, sources)}
              onCancel={() => setEditingId("")}
              onSaved={(saved) => {
                setStories((current) => current.map((row) => row.id === saved.id ? { ...row, ...saved } : row));
                setEditingId("");
                setMsg("草稿已儲存，尚未公開發布。");
              }}
            /> : <button
              type="button"
              className="button secondary"
              disabled={!!busy || !!editingId || loading || !!loadError || sourceUnavailable(x, sources)}
              onClick={() => { setMsg(""); setEditingId(x.id); }}
            >編輯草稿</button>}
            <p className="muted">公開前必須確認同意；需要時完成匿名化。</p>
            <button
              className="button"
              disabled={!!busy || !!editingId || loading || !!loadError || sourceUnavailable(x, sources)}
              onClick={() => publishStory(x)}
            >
              {busy === x.id ? "發布中…" : "確認並發布"}
            </button>
          </article>
        ))}
        {assets.map((x) => (
          <article className="card" key={x.id}>
            <span className="eyebrow">企業 ESG 素材</span>
            <h3>{x.title}</h3>
            <OutcomeSource origin={x} sources={sources} />
            <p>{x.summary}</p>
            <p className="muted">{x.period_label || "尚未設定期間"}</p>
            <label htmlFor={`asset-title-${x.id}`}>成果標題</label><input id={`asset-title-${x.id}`} value={assetEdits[x.id]?.title ?? x.title} onChange={e => setAssetEdits(v => ({...v, [x.id]: {...v[x.id], title: e.target.value}}))}/>
            <label htmlFor={`asset-summary-${x.id}`}>成果摘要</label><textarea id={`asset-summary-${x.id}`} value={assetEdits[x.id]?.summary ?? x.summary} onChange={e => setAssetEdits(v => ({...v, [x.id]: {...v[x.id], summary: e.target.value}}))}/>
            <label htmlFor={`asset-period-${x.id}`}>成果期間</label><input id={`asset-period-${x.id}`} value={assetEdits[x.id]?.period_label ?? x.period_label ?? ""} onChange={e => setAssetEdits(v => ({...v, [x.id]: {...v[x.id], period_label: e.target.value}}))}/>
            <button
              className="button"
              disabled={!!busy || !!editingId || loading || !!loadError || sourceUnavailable(x, sources)}
              onClick={() => approveAsset(x)}
            >
              {busy === x.id ? "處理中…" : "完成企業素材"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
