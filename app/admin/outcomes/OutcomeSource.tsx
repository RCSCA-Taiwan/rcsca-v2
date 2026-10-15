import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

export type OutcomeOrigin = {
  source_type: string | null;
  source_id: string | null;
};
type EnterpriseSource = {
  id: string;
  case_number: string | null;
  company_name: string | null;
};
export type EnterpriseSources = Record<string, EnterpriseSource>;

export async function loadEnterpriseSources(
  sb: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  origins: OutcomeOrigin[],
): Promise<EnterpriseSources> {
  const ids = [...new Set(origins
    .filter((x) => x.source_type === "enterprise_service_request" && x.source_id)
    .map((x) => x.source_id as string))];
  const sources: EnterpriseSources = {};
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await sb.from("enterprise_service_requests")
      .select("id,case_number,company_name")
      .in("id", ids.slice(offset, offset + 100));
    if (error) throw new Error("來源企業案件讀取失敗，請檢查連線或後台權限。");
    for (const row of (data || []) as EnterpriseSource[]) sources[row.id] = row;
  }
  return sources;
}

export function sourceUnavailable(origin: OutcomeOrigin, sources: EnterpriseSources) {
  return origin.source_type === "enterprise_service_request" &&
    (!origin.source_id || !sources[origin.source_id]);
}

export default function OutcomeSource({ origin, sources }: {
  origin: OutcomeOrigin;
  sources: EnterpriseSources;
}) {
  if (origin.source_type === "enterprise_service_request") {
    const source = origin.source_id ? sources[origin.source_id] : undefined;
    if (!source) return <p role="alert">來源企業案件無法讀取，暫停此筆操作。
      {origin.source_id && <span> 來源編號：{origin.source_id}</span>}
    </p>;
    return <p className="muted">來源案件：{source.case_number || source.id}
      <br />企業：{source.company_name || "未提供企業名稱"}</p>;
  }
  const label = origin.source_type === "activity_participation" ? "活動參與" :
    origin.source_type ? "其他成果" : "人工建立";
  return <p className="muted">來源：{label}
    {origin.source_id && <span> · 來源編號：{origin.source_id}</span>}</p>;
}
