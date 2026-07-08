import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://tjbwezoyvsddvphrdouk.supabase.co";
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYndlem95dnNkZHZwaHJkb3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTk4ODEsImV4cCI6MjA5NDE5NTg4MX0.hS9IvIaAHuldJeTt5sI5QhDclV2WPcFZsSCBL-gbRSw";
}

function getSupabaseSchema() {
  const schema = String(process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || "public").trim();
  return schema === "shima" ? "public" : schema;
}

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    db: { schema: getSupabaseSchema() },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always set cookies; middleware refreshes auth cookies.
        }
      },
    },
  });
}

export async function getCurrentServerUser() {
  if (!getSupabaseAnonKey()) return null;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user || null;
}
