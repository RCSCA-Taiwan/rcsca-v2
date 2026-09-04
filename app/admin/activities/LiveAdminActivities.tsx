"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

type Activity = {
  id: string;
  code: string;
  name: string;
  category: string;
  status: string;
  public_summary: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};
const blank = {
  id: "",
  code: "",
  name: "",
  category: "care",
  status: "draft",
  public_summary: "",
  starts_at: "",
  ends_at: "",
};
const labels: Record<string, string> = {
  draft: "草稿",
  published: "已公開",
  active: "進行中",
  completed: "已完成",
  cancelled: "已取消",
};
const toLocal = (v: string | null) =>
  v ? new Date(v).toISOString().slice(0, 16) : "";
export default function LiveAdminActivities() {
  const [rows, setRows] = useState<Activity[]>([]),
    [form, setForm] = useState<any>(blank),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  async function load() {
    const s = getSupabaseBrowserClient();
    const { data, error } = await s
      .from("activities")
      .select(
        "id,code,name,category,status,public_summary,starts_at,ends_at,created_at",
      )
      .order("created_at", { ascending: false });
    if (error) setNotice("目前帳號沒有活動管理權限。");
    else setRows((data || []) as Activity[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);
  function edit(a: Activity) {
    setForm({
      ...a,
      public_summary: a.public_summary || "",
      starts_at: toLocal(a.starts_at),
      ends_at: toLocal(a.ends_at),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save() {
    if (busy) return;
    if (!form.code.trim() || !form.name.trim()) {
      setNotice("請填寫活動代碼與名稱。");
      return;
    }
    if (
      form.starts_at &&
      form.ends_at &&
      new Date(form.ends_at) < new Date(form.starts_at)
    ) {
      setNotice("結束時間不得早於開始時間。");
      return;
    }
    const action = form.id ? "更新此活動" : "建立此活動";
    const visibility =
      form.status === "draft"
        ? ""
        : `並設定為「${labels[form.status] || form.status}」`;
    if (!window.confirm(`確定要${action}${visibility}嗎？`)) return;
    setBusy(true);
    setNotice("正在儲存活動主檔。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_upsert_activity", {
      p_activity_id: form.id || (null as unknown as string),
      p_code: form.code,
      p_name: form.name,
      p_category: form.category,
      p_public_summary: form.public_summary || undefined,
      p_starts_at: form.starts_at
        ? new Date(form.starts_at).toISOString()
        : undefined,
      p_ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
      p_status: form.status,
    });
    setBusy(false);
    if (error) {
      setNotice("儲存失敗，請確認活動管理權限、代碼是否重複及日期設定。");
      return;
    }
    setNotice(form.id ? "活動已更新。" : "活動已建立。");
    setForm(blank);
    await load();
  }
  return (
    <>
      <section className="partnerComposer">
        <div className="sectionHead compact">
          <div>
            <div className="eyebrow">活動主檔</div>
            <h2>先建立活動，再決定何時公開。</h2>
          </div>
          <p>草稿不會出現在公開網站；公開、進行中與完成狀態由管理端控制。</p>
        </div>
        <div className="partnerComposerGrid">
          <label>
            活動代碼
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="例如 CARE-2026-MA"
            />
          </label>
          <label>
            活動名稱
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            類別
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="care">公益關懷</option>
              <option value="connection">共享連結</option>
              <option value="other">其他</option>
            </select>
          </label>
          <label>
            狀態
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">草稿</option>
              <option value="published">已公開</option>
              <option value="active">進行中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </label>
          <label>
            開始時間
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
          </label>
          <label>
            結束時間
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
          </label>
          <label className="wide">
            公開摘要
            <textarea
              value={form.public_summary}
              onChange={(e) =>
                setForm({ ...form, public_summary: e.target.value })
              }
              placeholder="只填可以公開的活動說明，不放個案隱私。"
            />
          </label>
        </div>
        <div className="composerActions">
          <button disabled={busy} onClick={save}>
            {busy ? "儲存中…" : form.id ? "儲存活動更新" : "建立活動"}
          </button>
          {form.id && (
            <button className="secondaryAction" onClick={() => setForm(blank)}>
              取消編輯
            </button>
          )}
          <span role="status" aria-live="polite">
            {notice}
          </span>
        </div>
      </section>
      {loading ? (
        <div className="liveAccountLoading">正在讀取活動主檔…</div>
      ) : (
        <div className="enterpriseLedger">
          <div className="elHead">
            <span>狀態</span>
            <span>活動</span>
            <span>日期</span>
            <span>操作</span>
          </div>
          {rows.length ? (
            rows.map((a) => (
              <div className="elRow" key={a.id}>
                <span>{labels[a.status] || a.status}</span>
                <span>
                  <b>{a.name}</b>
                  <small>{a.code}</small>
                </span>
                <span>
                  {a.starts_at
                    ? new Date(a.starts_at).toLocaleDateString("zh-TW")
                    : "未設定"}
                  {a.ends_at
                    ? ` → ${new Date(a.ends_at).toLocaleDateString("zh-TW")}`
                    : ""}
                </span>
                <span>
                  <button
                    disabled={busy}
                    className="secondaryAction"
                    onClick={() => edit(a)}
                  >
                    編輯
                  </button>
                </span>
              </div>
            ))
          ) : (
            <div className="emptyData">目前沒有活動主檔。</div>
          )}
        </div>
      )}
    </>
  );
}
