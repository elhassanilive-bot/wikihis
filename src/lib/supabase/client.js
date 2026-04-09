let cachedClient = null;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
}

function getSupabaseSchema() {
  return process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || "shima";
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export async function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  if (!isSupabaseConfigured()) return null;

  const { createClient } = await import("@supabase/supabase-js");

  cachedClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    db: { schema: getSupabaseSchema() },
  });

  return cachedClient;
}
