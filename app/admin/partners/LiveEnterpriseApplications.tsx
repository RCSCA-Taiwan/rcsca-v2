"use client";
import { useEffect, useState } from "react";
import {getEnterpriseRegistrationClient} from "../../../lib/enterprise-registration-api";
import {networkCategoryPath} from "../../../lib/network-taxonomy";
type A = {
  industry_code?:string|null;professional_codes?:string[];network_public_consent?:boolean;network_public_description?:string|null;
  industry?:string|null;address?:string|null;website_url?:string|null;contact_title?:string|null;phone_extension?:string|null;mobile?:string|null;contribution_kind?:string|null;contribution_description?:string|null;
  id: string;
  company_name: string;
  tax_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  region: string | null;
  share_options: string[];
  direction: string | null;
  status: string;
  created_at: string;
};
export default function LiveEnterpriseApplications() {
  const [rows, setRows] = useState<A[]>([]),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const s = getEnterpriseRegistrationClient();
    const { data, error } = await s
      .from("enterprise_applications")
      .select(
        "id,company_name,tax_id,contact_name,contact_email,contact_phone,region,share_options,direction,status,created_at,industry,address,website_url,contact_title,phone_extension,mobile,contribution_kind,contribution_description,industry_code,professional_codes,network_public_consent,network_public_description",
      )
      .in("status", ["submitted", "under_review", "needs_info"])
      .order("created_at", { ascending: true });
    if (error) setNotice("目前帳號沒有企業申請審核權限。");
    else setRows((data || []) as A[]);
  }
  useEffect(() => {
    load();
  }, []);
  async function act(
    id: string,
    decision: "approved" | "needs_info" | "rejected",
  ) {
    if (busy) return;
    const action =
      decision === "approved"
        ? "核准此企業身份"
        : decision === "rejected"
          ? "判定此申請未通過"
          : "要求申請人補充資料";
    const row=rows.find(item=>item.id===id);const publishing=decision==="approved"&&row?.network_public_consent?"核准後將依申請人的同意，同步公開名稱、分類、縣市、網站與網絡介紹。":"";
    if (!window.confirm(`確定要${action}嗎？${publishing}`)) return;
    setBusy(id);
    setNotice("正在更新企業申請狀態。");
    const s = getEnterpriseRegistrationClient();
    const { error } = await s.rpc("admin_review_enterprise_application", {
      p_application_id: id,
      p_decision: decision,
      p_note: notes[id] || undefined,
    });
    setNotice(
      error
        ? "操作未完成，請確認管理權限或申請資料。"
        : decision === "approved"
          ? "企業已核准，申請帳號已連結企業身份。"
          : "申請狀態已更新並通知申請人。",
    );
    if (!error) await load();
    setBusy("");
  }
  return (
    <section className="adminWorkBlock">
      <div className="sectionHead compact">
        <div>
          <div className="eyebrow">共享合作夥伴註冊申請</div>
          <h2>先完成共享合作夥伴身份，再進入共享與 ESG 工作流。</h2>
        </div>
      </div>
      {notice && (
        <div className="workflowNotice" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      <div className="partnerReviewList">
        {rows.length ? (
          rows.map((a) => (
            <article key={a.id}>
              <div className="partnerReviewMain">
                <small>
                  {a.region || "未填地區"} · 統編 {a.tax_id}
                </small>
                <h3>{a.company_name}</h3>
                <p>
                  聯絡人：{a.contact_name}{a.contact_title?`（${a.contact_title}）`:""} · {a.contact_email}
                  {a.contact_phone ? ` · ${a.contact_phone}` : ""}{a.phone_extension?` 分機 ${a.phone_extension}`:""}{a.mobile?` · 手機 ${a.mobile}`:""}
                </p>
                <p>
                  可共享：
                  {a.share_options?.length
                    ? a.share_options.join("、")
                    : "尚未選擇"}
                  {a.direction ? `｜合作方向：${a.direction}` : ""}
                </p>
                {a.industry&&<p>主要產業：{a.industry_code?networkCategoryPath(a.industry_code):a.industry}</p>}{!!a.professional_codes?.length&&<p>其他專業／服務：{a.professional_codes.map(networkCategoryPath).join("、")}</p>}{a.industry_code&&<p>公開網絡：{a.network_public_consent?"已同意核准後自動公開":"僅建立分類對應，不公開"}</p>}{a.network_public_consent&&<p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>網絡公開介紹：{a.network_public_description}</p>}
                {a.address&&<p>企業/團體/店家地址：{a.address}</p>}
                {a.website_url&&<p>網站：{a.website_url}</p>}
                {a.contribution_description&&<p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>1% 產品／服務內容：{a.contribution_description}</p>}
                <textarea
                  value={notes[a.id] || ""}
                  onChange={(e) =>
                    setNotes((v) => ({ ...v, [a.id]: e.target.value }))
                  }
                  placeholder="審核說明／需補資料"
                />
              </div>
              <div className="reviewActions">
                <button disabled={!!busy} onClick={() => act(a.id, "approved")}>
                  {busy === a.id ? "處理中…" : "核准企業身份"}
                </button>
                <button
                  className="secondaryAction"
                  disabled={!!busy}
                  onClick={() => act(a.id, "needs_info")}
                >
                  請補資料
                </button>
                <button
                  className="dangerAction"
                  disabled={!!busy}
                  onClick={() => act(a.id, "rejected")}
                >
                  未通過
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="emptyData">目前沒有待審共享合作夥伴註冊申請。</div>
        )}
      </div>
    </section>
  );
}
