export type SupabaseReadiness = {
  configured: boolean;
  urlConfigured: boolean;
  anonKeyConfigured: boolean;
  serviceRoleConfigured: boolean;
  mode: 'prototype' | 'staging-ready';
};

export function getSupabaseReadiness(): SupabaseReadiness {
  const urlConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKeyConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return {
    configured: urlConfigured && anonKeyConfigured,
    urlConfigured,
    anonKeyConfigured,
    serviceRoleConfigured,
    mode: urlConfigured && anonKeyConfigured ? 'staging-ready' : 'prototype',
  };
}
