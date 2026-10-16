"use client";

import { useCallback, useEffect, useState } from "react";
import {getNetworkClient} from "../../lib/network-api";

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
        const client = getNetworkClient();
        const { data, error } = await client.from("public_network_directory")
          .select("id,category,display_name,region,public_description,website_url")
          .order("category");
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
