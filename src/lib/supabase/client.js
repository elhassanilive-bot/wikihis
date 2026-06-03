let cachedClient = null;

const DEFAULT_SUPABASE_URL = "https://tjbwezoyvsddvphrdouk.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYndlem95dnNkZHZwaHJkb3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTk4ODEsImV4cCI6MjA5NDE5NTg4MX0.hS9IvIaAHuldJeTt5sI5QhDclV2WPcFZsSCBL-gbRSw";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
}

function getSupabaseSchema() {
  const schema = String(process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || "public").trim();
  return schema === "shima" ? "public" : schema;
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
