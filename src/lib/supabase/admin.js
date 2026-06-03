let cachedAdminClient = null;

const DEFAULT_SUPABASE_URL = "https://tjbwezoyvsddvphrdouk.supabase.co";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function getSupabaseSchema() {
  return process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || "shima";
}

export function isSupabaseAdminConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export async function getSupabaseAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;
  if (!isSupabaseAdminConfigured()) return null;

  const { createClient } = await import("@supabase/supabase-js");

  cachedAdminClient = createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: { persistSession: false },
      db: { schema: getSupabaseSchema() },
    }
  );

  return cachedAdminClient;
}
