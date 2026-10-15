"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

export type PublicNetworkProfile = {
  id: string;
  category: string;
  display_name: string;
  region: string | null;
  public_description: string | null;
  website_url: string | null;
};

export function usePublicNetworkProfiles() {
  const [rows, setRows] = useState<PublicNetworkProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    async function load() {
      try {
        const client = getSupabaseBrowserClient();
        const { data, error } = await client.from("network_profiles")
          .select("id,category,display_name,region,public_description,website_url")
          .eq("status", "approved").eq("public_visible", true).order("category");
        if (error) throw error;
        if (active) setRows((data || []) as PublicNetworkProfile[]);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [attempt]);

  return { rows, loading, failed, retry };
}
