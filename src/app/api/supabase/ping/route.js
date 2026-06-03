import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_SUPABASE_URL = "https://tjbwezoyvsddvphrdouk.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYndlem95dnNkZHZwaHJkb3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTk4ODEsImV4cCI6MjA5NDE5NTg4MX0.hS9IvIaAHuldJeTt5sI5QhDclV2WPcFZsSCBL-gbRSw";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export async function GET() {
  const { url, anonKey } = getEnv();

  if (!url || !anonKey) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Missing Supabase env vars" },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const healthUrl = new URL("/auth/v1/health", url);
    const res = await fetch(healthUrl, {
      method: "GET",
      headers: {
        apikey: anonKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");

    return NextResponse.json({
      ok: res.ok,
      configured: true,
      status: res.status,
      body: text.slice(0, 500),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
