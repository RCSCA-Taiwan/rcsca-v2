"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
type P = {
  id: string;
  display_name: string | null;
  email: string | null;
  admin_roles: { role_key: string }[];
};
const roles = [
  ["admin", "一般管理"],
  ["case_manager", "個案管理"],
  ["network_manager", "Network 管理"],
  ["enterprise_reviewer", "企業審核"],
  ["outcome_reviewer", "成果審核"],
  ["super_admin", "最高管理"],
];
export default function LiveAdminAccess() {
  const [rows, setRows] = useState<P[]>([]),
    [q, setQ] = useState(""),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const { data, error } = await s
      .from("profiles")
      .select("id,display_name,email,admin_roles(role_key)")
      .order("display_name")
      .limit(200);
    if (error) setMsg("只有最高管理者可以查看與調整後台角色。");
    else setRows((data || []) as any);
  }
  useEffect(() => {
    load();
  }, []);
  async function toggle(u: P, key: string, on: boolean) {
    if (busy) return;
    const role = roles.find((r) => r[0] === key)?.[1] || key;
    const user = u.display_name || u.email || "此帳號";
    if (
      !window.confirm(
        `確定要${on ? "授予" : "移除"}「${user}」的「${role}」角色嗎？`,
      )
    )
      return;
    const busyKey = `${u.id}:${key}`;
    setBusy(busyKey);
    setMsg("正在更新後台角色。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_set_platform_role", {
      p_user_id: u.id,
      p_role_key: key,
      p_enabled: on,
    });
    setMsg(
      error ? "權限更新失敗；請確認最高管理權限與限制。" : "後台角色已更新。",
    );
    if (!error) await load();
    setBusy("");
  }
  const shown = rows.filter(
    (r) =>
      (r.display_name || "").toLowerCase().includes(q.toLowerCase()) ||
      (r.email || "").toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="workflowNotice">
        後台權限採角色分工；不因企業規模、捐款金額或會員等級自動取得。
      </div>
      <input
        className="directorySearch"
        aria-label="搜尋姓名或 Email"
        placeholder="搜尋姓名或 Email"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {msg && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {msg}
        </div>
      )}
      <div className="partnerReviewList">
        {shown.map((u) => (
          <article key={u.id}>
            <div className="partnerReviewMain">
              <h3>{u.display_name || u.email || "未命名帳號"}</h3>
              <p>{u.email}</p>
            </div>
            <div className="accessRoleGrid">
              {roles.map(([key, label]) => {
                const on = (u.admin_roles || []).some(
                  (x) => x.role_key === key,
                );
                const busyKey = `${u.id}:${key}`;
                return (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!!busy}
                      aria-busy={busy === busyKey}
                      onChange={(e) => toggle(u, key, e.target.checked)}
                    />
                    <span>
                      {label}
                      {busy === busyKey ? "（更新中）" : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
