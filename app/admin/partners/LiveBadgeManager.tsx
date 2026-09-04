"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type Ent = { id: string; display_name: string | null; legal_name: string };
type Badge = {
  id: string;
  enterprise_id: string;
  year: number;
  badge_label: string;
  status: string;
  issued_at: string | null;
};
export default function LiveBadgeManager() {
  const year = new Date().getFullYear(),
    [ents, setEnts] = useState<Ent[]>([]),
    [badges, setBadges] = useState<Badge[]>([]),
    [selected, setSelected] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const [{ data: e, error }, { data: b }] = await Promise.all([
      s
        .from("enterprises")
        .select("id,display_name,legal_name")
        .eq("status", "approved")
        .order("legal_name"),
      s
        .from("enterprise_badges")
        .select("id,enterprise_id,year,badge_label,status,issued_at")
        .eq("year", year),
    ]);
    if (error) {
      setNotice("目前帳號沒有年度標章管理權限。");
      return;
    }
    setEnts((e || []) as Ent[]);
    setBadges((b || []) as Badge[]);
  }
  useEffect(() => {
    load();
  }, []);
  const byEnt = useMemo(
    () => new Map(badges.map((x) => [x.enterprise_id, x])),
    [badges],
  );
  async function issue() {
    if (!selected || busy) return;
    const ent = ents.find((e) => e.id === selected);
    if (
      !window.confirm(
        `確定核發 ${year} 年度標章給「${ent?.display_name || ent?.legal_name || "此企業"}」嗎？`,
      )
    )
      return;
    setBusy("issue");
    setNotice("正在核發年度標章。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_issue_enterprise_badge", {
      p_enterprise_id: selected,
      p_year: year,
      p_badge_label: "1% PARTNER",
      p_expires_at: undefined,
    });
    setNotice(
      error
        ? "標章核發失敗，請確認管理權限與企業狀態。"
        : "年度標章已核發並通知企業管理者。",
    );
    if (!error) await load();
    setBusy("");
  }
  async function revoke(id: string) {
    if (
      busy ||
      !window.confirm("確定撤回此年度標章嗎？公開驗證狀態將同步變更。")
    )
      return;
    setBusy(id);
    setNotice("正在撤回年度標章。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_revoke_enterprise_badge", {
      p_badge_id: id,
      p_note: "管理端撤回年度標章",
    });
    setNotice(
      error
        ? "標章撤回失敗，請確認管理權限與標章狀態。"
        : "年度標章已撤回並通知企業管理者。",
    );
    if (!error) await load();
    setBusy("");
  }
  return (
    <section className="adminWorkBlock">
      <div className="sectionHead compact">
        <div>
          <div className="eyebrow">年度共享標章</div>
          <h2>標章必須由已核實的共享紀錄支撐。</h2>
        </div>
        <p>核發不是付款結果，也不是 ESG 認證。管理端只處理年度共享標章狀態。</p>
      </div>
      {notice && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      <div className="badgeAdminComposer">
        <select
          aria-label="選擇已核准企業"
          value={selected}
          disabled={!!busy}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">選擇已核准企業</option>
          {ents.map((e) => (
            <option key={e.id} value={e.id}>
              {e.display_name || e.legal_name}
            </option>
          ))}
        </select>
        <button onClick={issue} disabled={!selected || !!busy}>
          {busy === "issue" ? "核發中…" : `核發 ${year} 年度標章`}
        </button>
      </div>
      <div className="partnerReviewList">
        {ents
          .filter((e) => byEnt.has(e.id))
          .map((e) => {
            const b = byEnt.get(e.id)!;
            return (
              <article key={b.id}>
                <div className="partnerReviewMain">
                  <small>
                    {b.year} · {b.status}
                  </small>
                  <h3>{e.display_name || e.legal_name}</h3>
                  <p>
                    {b.badge_label} ·{" "}
                    {b.issued_at
                      ? new Date(b.issued_at).toLocaleDateString("zh-TW")
                      : "尚未記錄核發日"}
                  </p>
                </div>
                <div className="reviewActions">
                  {b.status === "issued" && (
                    <button
                      disabled={!!busy}
                      className="dangerAction"
                      onClick={() => revoke(b.id)}
                    >
                      {busy === b.id ? "撤回中…" : "撤回年度標章"}
                    </button>
                  )}
                  <a
                    className="textRoute"
                    href={`/1percent-partner/badge/${b.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    公開驗證頁 →
                  </a>
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
