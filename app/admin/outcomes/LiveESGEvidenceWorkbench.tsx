"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type Row = {
  id: string;
  enterprise_name: string;
  title: string;
  period_label: string | null;
  status: string;
  report_ready: boolean;
  export_ready: boolean;
  quality_issues: string[] | null;
  source_type: string | null;
  source_reference: string | null;
  source_verified: boolean | null;
  delivery_ready: boolean;
  updated_at: string;
};
export default function LiveESGEvidenceWorkbench() {
  const [rows, setRows] = useState<Row[]>([]),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  async function load() {
    const s = getSupabaseBrowserClient();
    if (!s) return;
    const { data, error } = await s
      .from("admin_esg_evidence_workbench")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      setMsg("需要 RCSCA 成果審核權限才能查看。");
      return;
    }
    setRows((data || []) as Row[]);
    setMsg("");
  }
  useEffect(() => {
    load();
  }, []);
  const stats = useMemo(
    () => ({
      all: rows.length,
      ready: rows.filter((x) => x.delivery_ready).length,
      hold: rows.filter((x) => !x.delivery_ready).length,
      source: rows.filter((x) => !x.source_verified).length,
    }),
    [rows],
  );
  async function setReady(x: Row, ready: boolean) {
    if (
      busy ||
      !window.confirm(
        ready ? "確定開放此成果供正式報告使用嗎？" : "確定暫緩此成果交付嗎？",
      )
    )
      return;
    const s = getSupabaseBrowserClient();
    if (!s) return;
    setBusy(x.id);
    const { error } = await s.rpc("admin_set_esg_evidence_review", {
      p_asset_id: x.id,
      p_report_ready: ready,
      p_note: ready
        ? "成果證據與內容確認，可供報告使用"
        : "成果暫緩交付，待補強",
    });
    setBusy(null);
    setMsg(
      error
        ? "更新失敗，請確認權限與成果狀態。"
        : ready
          ? "已標記可供報告使用。"
          : "已暫緩交付。",
    );
    await load();
  }
  return (
    <section className="panel">
      <div className="section-head">
        <h2>ESG 成果證據審核</h2>
        <span>
          {stats.ready} / {stats.all} 筆可交付
        </span>
      </div>
      <div className="grid">
        <article className="card">
          <small>待補強</small>
          <h3>{stats.hold} 筆</h3>
        </article>
        <article className="card">
          <small>來源待核實</small>
          <h3>{stats.source} 筆</h3>
        </article>
        <article className="card">
          <small>正式可交付</small>
          <h3>{stats.ready} 筆</h3>
        </article>
      </div>
      {msg && (
        <p role="status" aria-live="polite">
          {msg}
        </p>
      )}
      <div className="grid">
        {rows.map((x) => (
          <article className="card" key={x.id}>
            <span className="eyebrow">
              {x.enterprise_name} · {x.period_label || "未設定期間"}
            </span>
            <h3>{x.title}</h3>
            <p>
              內容完整：{x.export_ready ? "是" : "否"} · 來源核實：
              {x.source_verified ? "是" : "否"} · 報告狀態：
              {x.report_ready ? "已開放" : "未開放"}
            </p>
            {x.quality_issues?.length ? (
              <p className="muted">待補：{x.quality_issues.join("、")}</p>
            ) : null}
            <p className="muted">
              來源：{x.source_reference || x.source_type || "尚未建立來源參考"}
            </p>
            <strong>
              {x.delivery_ready ? "✓ 可正式交付" : "尚未達正式交付標準"}
            </strong>
            <div>
              <button
                className="button"
                disabled={
                  !!busy ||
                  x.status !== "approved" ||
                  !x.export_ready ||
                  !x.source_verified
                }
                onClick={() => setReady(x, true)}
              >
                確認可供報告使用
              </button>
              {x.report_ready && (
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() => setReady(x, false)}
                >
                  {busy === x.id ? "處理中…" : "暫緩交付"}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
