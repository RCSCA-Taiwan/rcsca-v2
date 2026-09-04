"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type R = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  point_cost: number;
  stock_total: number | null;
  stock_remaining: number | null;
  min_level: number | null;
  min_footprints: number;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};
const blank = {
  category: "daily",
  title: "",
  description: "",
  point_cost: 0,
  stock_total: "",
  min_level: 1,
  min_footprints: 0,
  status: "draft",
  starts_at: "",
  ends_at: "",
};
export default function LiveRewardCatalog() {
  const [rows, setRows] = useState<R[]>([]),
    [form, setForm] = useState<any>(blank),
    [editing, setEditing] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const s = getSupabaseBrowserClient();
    const { data, error } = await s
      .from("reward_catalog")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) setNotice("目前帳號沒有共享所目錄管理權限。");
    else setRows((data || []) as R[]);
  }
  useEffect(() => {
    load();
  }, []);
  function edit(r: R) {
    setEditing(r.id);
    setForm({
      category: r.category,
      title: r.title,
      description: r.description || "",
      point_cost: r.point_cost,
      stock_total: r.stock_total ?? "",
      min_level: r.min_level || 1,
      min_footprints: r.min_footprints,
      status: r.status,
      starts_at: r.starts_at ? r.starts_at.slice(0, 16) : "",
      ends_at: r.ends_at ? r.ends_at.slice(0, 16) : "",
    });
  }
  async function save(e: any) {
    e.preventDefault();
    if (busy) return;
    const pointCost = Number(form.point_cost);
    const stockTotal =
      form.stock_total === "" ? null : Number(form.stock_total);
    const minLevel = Number(form.min_level);
    const minFootprints = Number(form.min_footprints);
    if (
      !Number.isInteger(pointCost) ||
      pointCost < 0 ||
      (stockTotal !== null &&
        (!Number.isInteger(stockTotal) || stockTotal < 0)) ||
      !Number.isInteger(minLevel) ||
      minLevel < 1 ||
      minLevel > 5 ||
      !Number.isInteger(minFootprints) ||
      minFootprints < 0
    ) {
      setNotice("共享點、名額、等級與足跡必須是有效的非負整數。");
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
    const action = editing ? "更新此共享回饋" : "建立此共享回饋";
    const state =
      form.status === "draft"
        ? ""
        : `並設定為「${form.status === "approved" ? "上架" : "停止上架"}」`;
    if (!window.confirm(`確定要${action}${state}嗎？`)) return;
    setBusy(true);
    setNotice("正在儲存共享回饋目錄。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_upsert_reward_catalog", {
      p_reward_id: editing || (null as unknown as string),
      p_category: form.category,
      p_title: form.title,
      p_description: form.description,
      p_point_cost: pointCost,
      p_stock_total: stockTotal ?? (null as unknown as number),
      p_min_level: minLevel,
      p_min_footprints: minFootprints,
      p_status: form.status,
      p_starts_at: form.starts_at
        ? new Date(form.starts_at).toISOString()
        : undefined,
      p_ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
    });
    setNotice(
      error
        ? "儲存未完成，請確認目錄管理權限、必填欄位與數值設定。"
        : "共享回饋目錄已更新。",
    );
    setBusy(false);
    if (!error) {
      setEditing(null);
      setForm(blank);
      await load();
    }
  }
  return (
    <section className="panel">
      <div className="section-head">
        <h2>共享回饋目錄</h2>
        <span>{rows.length} 項</span>
      </div>
      <form className="partnerComposerGrid" onSubmit={save}>
        <label>
          分類
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="daily">日常共享</option>
            <option value="selected">精選共享</option>
            <option value="rare">稀有共享</option>
            <option value="secret">1% 專屬</option>
          </select>
        </label>
        <label>
          名稱
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label>
          共享點
          <input
            type="number"
            min="0"
            required
            value={form.point_cost}
            onChange={(e) => setForm({ ...form, point_cost: e.target.value })}
          />
        </label>
        <label>
          總名額
          <input
            type="number"
            min="0"
            value={form.stock_total}
            onChange={(e) => setForm({ ...form, stock_total: e.target.value })}
            placeholder="留空＝不限"
          />
        </label>
        <label>
          最低等級
          <select
            value={form.min_level}
            onChange={(e) => setForm({ ...form, min_level: e.target.value })}
          >
            {[1, 2, 3, 4, 5].map((x) => (
              <option key={x} value={x}>
                Lv.{x}
              </option>
            ))}
          </select>
        </label>
        <label>
          最低共享足跡
          <input
            type="number"
            min="0"
            value={form.min_footprints}
            onChange={(e) =>
              setForm({ ...form, min_footprints: e.target.value })
            }
          />
        </label>
        <label>
          狀態
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="draft">草稿</option>
            <option value="approved">上架</option>
            <option value="rejected">停止上架</option>
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
          公開說明
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <div>
          <button className="button" disabled={busy}>
            {busy ? "儲存中…" : editing ? "儲存修改" : "建立共享回饋"}
          </button>
          {editing && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
            >
              取消編輯
            </button>
          )}
        </div>
      </form>
      {notice && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      <div className="partnerReviewList">
        {rows.map((r) => (
          <article key={r.id}>
            <div className="partnerReviewMain">
              <small>
                {r.status} · {r.point_cost} 共享點 · 剩餘{" "}
                {r.stock_remaining === null ? "不限" : r.stock_remaining}
              </small>
              <h3>{r.title}</h3>
              <p>{r.description || "沒有公開說明"}</p>
            </div>
            <div className="reviewActions">
              <button disabled={busy} onClick={() => edit(r)}>
                編輯
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
