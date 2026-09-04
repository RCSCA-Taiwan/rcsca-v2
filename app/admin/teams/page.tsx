"use client";
import { FormEvent, useEffect, useState } from "react";
import SiteHeader from "../../SiteHeader";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type Team = {
  id: string;
  name: string;
  description: string | null;
  leader_user_id: string | null;
  is_active: boolean;
  profiles?: { display_name: string | null; email: string | null } | null;
};
export default function AdminTeams() {
  const [rows, setRows] = useState<Team[]>([]),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [leaderEmail, setLeaderEmail] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const s = getSupabaseBrowserClient();
    const { data, error } = await s
      .from("teams")
      .select(
        "id,name,description,leader_user_id,is_active,profiles!teams_leader_user_id_fkey(display_name,email)",
      )
      .order("created_at", { ascending: false });
    if (error) setNotice("目前帳號沒有共享小隊管理權限。");
    else setRows((data || []) as any);
  }
  useEffect(() => {
    load();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const cleanName = name.trim();
    if (!cleanName) {
      setNotice("請填寫小隊名稱。");
      return;
    }
    setBusy(true);
    setNotice("正在確認小隊資料。");
    const s = getSupabaseBrowserClient();
    let leader: string | null = null;
    if (leaderEmail.trim()) {
      const { data: p } = await s
        .from("profiles")
        .select("id")
        .eq("email", leaderEmail.trim().toLowerCase())
        .maybeSingle();
      if (!p) {
        setBusy(false);
        setNotice("找不到這個已註冊 Email，請先確認對方已有 RCSCA 帳號。");
        return;
      }
      leader = p.id;
    }
    if (
      !window.confirm(
        `確定建立「${cleanName}」共享小隊${leaderEmail.trim() ? `，並指定 ${leaderEmail.trim()} 為小隊長` : ""}嗎？`,
      )
    ) {
      setBusy(false);
      setNotice("");
      return;
    }
    setNotice("正在建立共享小隊。");
    const { error } = await s.rpc("admin_upsert_team", {
      p_team_id: null as unknown as string,
      p_name: cleanName,
      p_description: description.trim(),
      p_leader_user_id: leader || (null as unknown as string),
      p_is_active: true,
    });
    setBusy(false);
    setNotice(
      error
        ? "建立失敗，請確認管理權限或小隊長是否已在其他小隊。"
        : "共享小隊已建立。",
    );
    if (!error) {
      setName("");
      setDescription("");
      setLeaderEmail("");
      await load();
    }
  }
  return (
    <main className="adminPage">
      <SiteHeader />
      <section className="flowHero">
        <div className="portalWrap">
          <div className="eyebrow">共享小隊管理</div>
          <h1>小隊用來凝聚同行關係，不用來建立上下線。</h1>
          <p>
            後台建立小隊與小隊長；成員透過可追溯邀請加入。介紹來源保留，但不影響
            XP、點數、會籍或利益。
          </p>
        </div>
      </section>
      <section className="portalSection">
        <div className="portalWrap">
          {notice && (
            <div className="workflowNotice" role="status" aria-live="polite">
              {notice}
            </div>
          )}
          <form className="shareCorrection" onSubmit={submit}>
            <h2>建立共享小隊</h2>
            <input
              required
              disabled={busy}
              aria-label="小隊名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="小隊名稱"
            />
            <textarea
              value={description}
              disabled={busy}
              aria-label="小隊說明"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="小隊說明（選填）"
            />
            <input
              type="email"
              disabled={busy}
              aria-label="小隊長已註冊 Email"
              value={leaderEmail}
              onChange={(e) => setLeaderEmail(e.target.value)}
              placeholder="小隊長已註冊 Email（選填）"
            />
            <button disabled={busy}>{busy ? "建立中…" : "建立小隊"}</button>
          </form>
          <div className="partnerReviewList">
            {rows.length ? (
              rows.map((t) => (
                <article key={t.id}>
                  <div className="partnerReviewMain">
                    <small>{t.is_active ? "啟用中" : "已停用"}</small>
                    <h3>{t.name}</h3>
                    <p>{t.description || "未設定小隊說明"}</p>
                    <p>
                      小隊長：
                      {t.profiles?.display_name ||
                        t.profiles?.email ||
                        "尚未指定"}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="emptyData">目前尚未建立共享小隊。</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
