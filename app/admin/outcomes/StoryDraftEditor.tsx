"use client";
import { useRef, useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

export type EditableStory = {
  id: string;
  title: string;
  summary: string;
  updated_at: string;
};

export default function StoryDraftEditor({ story, disabled, onSaved, onCancel }: {
  story: EditableStory;
  disabled: boolean;
  onSaved: (story: EditableStory) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(story.title);
  const [summary, setSummary] = useState(story.summary);
  // Keep the revision captured when editing began, even if the list refreshes.
  const [revision] = useState(story.updated_at);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || savingRef.current) return;
    const nextTitle = title.trim(), nextSummary = summary.trim();
    if (!nextTitle || !nextSummary) {
      setError("請填寫標題與摘要。");
      return;
    }
    if (nextTitle.length > 200 || nextSummary.length > 10000) {
      setError("標題最多 200 字，摘要最多 10,000 字。");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const sb = getSupabaseBrowserClient();
      if (!sb) throw new Error("service_unavailable");
      const { data, error: rpcError } = await sb.rpc("admin_save_cycle_story_draft", {
        p_story_id: story.id,
        p_title: nextTitle,
        p_summary: nextSummary,
        p_expected_updated_at: revision,
      });
      if (rpcError) throw rpcError;
      if (typeof data !== "string" || !data) throw new Error("missing_saved_revision");
      onSaved({ id: story.id, title: nextTitle, summary: nextSummary, updated_at: data });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message :
        typeof cause === "object" && cause !== null && "message" in cause ? String(cause.message) : "";
      setError(message.includes("cycle_story_changed")
        ? "此草稿已被更新，未覆蓋新內容。請先複製你輸入的內容，再取消編輯並重新整理。"
        : "草稿儲存失敗；輸入內容仍保留。請確認連線、權限與草稿狀態後重試。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <form onSubmit={save}>
    <p className="muted">儲存只更新草稿內容，不會公開發布或確認公開同意。</p>
    <label htmlFor={`story-title-${story.id}`}>標題</label>
    <input id={`story-title-${story.id}`} value={title} required maxLength={200}
      disabled={saving} onChange={(event) => setTitle(event.target.value)} />
    <label htmlFor={`story-summary-${story.id}`}>摘要</label>
    <textarea id={`story-summary-${story.id}`} value={summary} required maxLength={10000}
      rows={6} disabled={saving} onChange={(event) => setSummary(event.target.value)} />
    {error && <p role="alert">{error}</p>}
    <div>
      <button className="button" type="submit" disabled={disabled || saving}>
        {saving ? "儲存中…" : "儲存草稿"}
      </button>
      <button className="button secondary" type="button" disabled={saving} onClick={onCancel}>
        取消編輯
      </button>
    </div>
  </form>;
}
