import { NextResponse } from "next/server";
import { listSearchSuggestions } from "@/lib/blog/posts";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = String(searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const { suggestions, error } = await listSearchSuggestions({ search: query, limit: 7 });

  return NextResponse.json(
    { suggestions, error },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      },
    }
  );
}
