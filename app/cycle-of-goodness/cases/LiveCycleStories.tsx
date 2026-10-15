"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

type Story = {
  id: string;
  title: string;
  summary: string;
  role_flow: string[];
  public_source_label: string | null;
  public_source_note: string | null;
};

export default function LiveCycleStories() {
  const [rows, setRows] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const client = getSupabaseBrowserClient();
      const { data, error: queryError } = await client.from("cycle_stories")
        .select("id,title,summary,role_flow,public_source_label,public_source_note")
        .eq("status", "approved").eq("consent_confirmed", true)
        .order("published_at", { ascending: false });
      if (queryError) throw queryError;
      setRows((data || []) as Story[]);
    } catch {
      setError("公開案例讀取失敗，請稍後重試。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  if (loading) return <p role="status">正在讀取已公開的善循環案例…</p>;
  if (error) return <div><p role="alert">{error}</p>
    <button type="button" className="button secondary" onClick={() => void load()}>重新讀取</button>
  </div>;
  if (!rows.length) return <p className="emptyData">目前尚無完成公開審核的真實案例。案例必須先完成同意、匿名化與 RCSCA 審核，才會出現在這裡。</p>;
  return <div className="caseList">{rows.map((story, index) => <article key={story.id}>
    <span>{String(index + 1).padStart(2, "0")}</span>
    <h2>{story.title}</h2><p>{story.summary}</p>
    {story.public_source_label && <p className="evidenceNote"><strong>成果來源：</strong>
      {story.public_source_label}{story.public_source_note ? ` · ${story.public_source_note}` : ""}
    </p>}
    <div className="caseSteps">{(story.role_flow || []).map((step, i, steps) => <div key={`${story.id}-${i}`}>
      <b>{i + 1}</b><p>{step}</p>{i < steps.length - 1 && <i>→</i>}
    </div>)}</div>
  </article>)}</div>;
}
