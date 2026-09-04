"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import type { Database } from "../../../lib/database.types";
type MembershipType = Database["public"]["Enums"]["membership_type"];
type V = {
  id: string;
  user_id: string;
  verification_kind: string;
  status: string;
  created_at: string;
  profiles: any;
};
type M = {
  id: string;
  user_id: string;
  membership_type: string;
  member_since: string | null;
  member_number: string | null;
  status: string;
  profiles: any;
};
export default function LiveAdminMembers() {
  const [verifications, setVerifications] = useState<V[]>([]),
    [members, setMembers] = useState<M[]>([]),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const s = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await s.auth.getSession();
    if (!session) {
      setNotice("請先使用管理帳號登入。");
      setLoading(false);
      return;
    }
    const [v, m] = await Promise.all([
      s
        .from("identity_verifications")
        .select(
          "id,user_id,verification_kind,status,created_at,profiles(display_name,email)",
        )
        .eq("status", "pending")
        .order("created_at"),
      s
        .from("memberships")
        .select(
          "id,user_id,membership_type,member_since,member_number,status,profiles(display_name,email)",
        )
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);
    if (v.error || m.error)
      setNotice("目前帳號沒有會員管理權限，或資料讀取失敗。");
    setVerifications((v.data || []) as any);
    setMembers((m.data || []) as any);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);
  async function review(id: string, ok: boolean) {
    if (busy) return;
    if (
      !window.confirm(
        ok ? "確定核准這筆身份驗證嗎？" : "確定退回這筆身份驗證嗎？",
      )
    )
      return;
    const rawNote = window.prompt(
      ok ? "核實備註（可留空）" : "未通過原因（建議填寫）",
      "",
    );
    if (rawNote === null) return;
    setBusy(id);
    setNotice("正在更新身份驗證。");
    const s = getSupabaseBrowserClient();
    const note = rawNote.trim() || undefined;
    const { error } = await s.rpc("admin_review_identity_verification", {
      p_verification_id: id,
      p_approved: ok,
      p_note: note,
    });
    setNotice(
      error
        ? "操作失敗：請確認管理權限。"
        : ok
          ? "身份驗證已核准。"
          : "身份驗證已退回。",
    );
    if (!error) await load();
    setBusy("");
  }
  async function membership(userId: string) {
    if (busy) return;
    const rawType = window.prompt("會籍類型：annual 或 lifetime", "annual");
    if (rawType === null) return;
    const type = rawType.trim() as MembershipType;
    if (!["annual", "lifetime"].includes(type)) return;
    const rawNumber = window.prompt("會員編號（可留空）", "");
    if (rawNumber === null) return;
    if (
      !window.confirm(
        `確定設定為 ${type === "annual" ? "年度" : "永久"}會籍嗎？`,
      )
    )
      return;
    const number = rawNumber.trim() || undefined;
    setBusy(userId);
    setNotice("正在更新正式會員身份。");
    const s = getSupabaseBrowserClient();
    const { error } = await s.rpc("admin_set_membership", {
      p_user_id: userId,
      p_membership_type: type,
      p_member_since: new Date().toISOString().slice(0, 10),
      p_member_number: number,
      p_status: "active",
      p_note: "後台會員身份更新",
    });
    setNotice(
      error ? "會籍更新失敗，請確認權限與會員資料。" : "正式會員身份已更新。",
    );
    if (!error) await load();
    setBusy("");
  }
  if (loading)
    return <div className="liveAccountLoading">正在讀取會員工作區…</div>;
  return (
    <>
      {notice && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      <div className="sectionHead">
        <div>
          <div className="eyebrow">待處理</div>
          <h2>身份驗證</h2>
        </div>
        <p>只處理驗證結果；不在這個畫面展示敏感識別碼。</p>
      </div>
      <div className="verificationTable">
        <div className="vtHead">
          <span>帳號</span>
          <span>類型</span>
          <span>狀態</span>
          <span>操作</span>
        </div>
        {verifications.length ? (
          verifications.map((v) => (
            <div className="vtRow" key={v.id}>
              <span>
                <b>
                  {v.profiles?.display_name || v.profiles?.email || "使用者"}
                </b>
                <small>{v.user_id.slice(0, 8)}</small>
              </span>
              <span>{v.verification_kind}</span>
              <span>
                <i>待核實</i>
              </span>
              <span className="verifyActions">
                <button disabled={!!busy} onClick={() => review(v.id, true)}>
                  {busy === v.id ? "處理中…" : "核實"}
                </button>
                <button
                  className="secondaryAction"
                  disabled={!!busy}
                  onClick={() => review(v.id, false)}
                >
                  退回
                </button>
                <button
                  className="secondaryAction"
                  disabled={!!busy}
                  onClick={() => membership(v.user_id)}
                >
                  設定會籍
                </button>
              </span>
            </div>
          ))
        ) : (
          <div className="emptyData">目前沒有待核實身份。</div>
        )}
      </div>
      <div className="sectionHead">
        <div>
          <div className="eyebrow">正式會員</div>
          <h2>目前會籍</h2>
        </div>
      </div>
      <div className="verificationTable">
        <div className="vtHead">
          <span>會員</span>
          <span>會籍</span>
          <span>加入日期</span>
          <span>會員編號</span>
        </div>
        {members.length ? (
          members.map((m) => (
            <div className="vtRow" key={m.id}>
              <span>
                <b>{m.profiles?.display_name || m.profiles?.email || "會員"}</b>
                <small>{m.status}</small>
              </span>
              <span>RCSCA MEMBER</span>
              <span>{m.member_since || "—"}</span>
              <span>{m.member_number || "—"}</span>
            </div>
          ))
        ) : (
          <div className="emptyData">目前沒有正式會員資料。</div>
        )}
      </div>
    </>
  );
}
