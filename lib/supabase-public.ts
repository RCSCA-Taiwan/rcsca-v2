export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function publicSelect<T>(table: string, query = ''): Promise<T[]> {
  if (!supabaseUrl || !supabasePublishableKey) return [];
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
    },
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    console.error(`Supabase public read failed: ${table}`, response.status);
    return [];
  }
  return response.json();
}
