"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export default function SearchBoxWithSuggestions({ initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        setSuggestions(Array.isArray(payload?.suggestions) ? payload.suggestions : []);
        setOpen(true);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  return (
    <form action="/search" className="relative mt-7 flex flex-col gap-3 sm:flex-row" ref={containerRef}>
      <div className="relative flex-1">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => trimmedQuery.length >= 2 && setOpen(true)}
          placeholder="مثال: الصحة، التكنولوجيا، السفر..."
          autoComplete="off"
          className="min-h-13 w-full rounded-full border border-slate-300 px-5 pr-12 text-right outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
        />
        <svg
          viewBox="0 0 24 24"
          className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" />
        </svg>

        {open && trimmedQuery.length >= 2 ? (
          <div className="absolute inset-x-0 top-[calc(100%+0.55rem)] z-30 overflow-hidden rounded-3xl border border-slate-200 bg-white text-right shadow-[0_24px_70px_-38px_rgba(15,23,42,0.55)]">
            <div className="border-b border-slate-100 px-5 py-3 text-xs font-black text-slate-500">
              {loading ? "جارٍ جلب الاقتراحات..." : suggestions.length ? "اقتراحات البحث" : "لا توجد اقتراحات مطابقة"}
            </div>
            {suggestions.length ? (
              <div className="max-h-[24rem] overflow-y-auto">
                {suggestions.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/blog/${item.slug}`}
                    className="block border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-red-50/60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-sm font-black text-slate-950">{item.title}</div>
                        <div className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">{item.excerpt}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        {item.category || "مقال"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
            <Link
              href={`/search?q=${encodeURIComponent(trimmedQuery)}`}
              className="block bg-slate-50 px-5 py-3 text-center text-sm font-black text-red-700 transition hover:bg-red-50"
            >
              عرض كل النتائج عن "{trimmedQuery}"
            </Link>
          </div>
        ) : null}
      </div>

      <button className="wikihat-red-primary min-h-13 rounded-full border px-7 text-sm font-black">
        بحث
      </button>
    </form>
  );
}
