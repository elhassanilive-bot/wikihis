"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

function formatCount(value) {
  const count = Number(value) || 0;
  if (count < 1000) return String(count);
  if (count < 1000000) return `${Math.round(count / 100) / 10}k`;
  return `${Math.round(count / 100000) / 10}m`;
}

function HeartIcon({ filled = false, className = "" }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        d="M12.1 21.2l-.1.1-.1-.1C7 16.9 4 14.1 4 10.8 4 8.6 5.6 7 7.8 7c1.4 0 2.8.7 3.6 1.8.8-1.1 2.2-1.8 3.6-1.8 2.2 0 3.8 1.6 3.8 3.8 0 3.3-3 6.1-7.8 10.4z"
      />
    </svg>
  );
}

function BookmarkIcon({ filled = false, className = "" }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          fill="currentColor"
          d="M6 3h12a2 2 0 0 1 2 2v17l-8-4-8 4V5a2 2 0 0 1 2-2z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        d="M6 3h12a2 2 0 0 1 2 2v17l-8-4-8 4V5a2 2 0 0 1 2-2z"
      />
    </svg>
  );
}

export default function ArticleEngagementBar({ postId, slug }) {
  const [session, setSession] = useState(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState(null);
  const viewTrackedRef = useRef(false);
  const toastTimerRef = useRef(null);

  const canUse = useMemo(() => Boolean(isSupabaseConfigured() && postId && slug), [postId, slug]);

  useEffect(() => {
    if (!canUse) return;
    let active = true;

    async function bootstrap() {
      const supabase = await getSupabaseClient();
      if (!supabase || !active) return;

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!active) return;
      setSession(currentSession);
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [canUse]);

  useEffect(() => {
    if (!canUse) return;
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;

    async function track() {
      const supabase = await getSupabaseClient();
      if (!supabase) return;
      await supabase.rpc("increment_post_view", { post_slug: slug });

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession?.user?.id && postId) {
        await supabase.from("blog_post_views").insert({
          post_id: postId,
          user_id: currentSession.user.id,
        });
      }
    }

    track();
  }, [canUse, postId, slug]);

  useEffect(() => {
    if (!canUse) return;
    let active = true;

    async function load() {
      const supabase = await getSupabaseClient();
      if (!supabase || !active) return;

      const { count } = await supabase
        .from("blog_post_reactions")
        .select("id", { head: true, count: "exact" })
        .eq("post_id", postId)
        .eq("reaction_type", "like");

      if (!active) return;
      setLikesCount(Number(count) || 0);

      // Bookmarks are private; we only expose the aggregate count via RPC.
      const { data: bookmarksCountData } = await supabase.rpc("get_post_bookmark_count", { post_slug: slug });
      if (!active) return;
      setBookmarksCount(Number(bookmarksCountData) || 0);

      if (!session?.user) {
        setLiked(false);
        setSaved(false);
        return;
      }

      const { data: likeRow } = await supabase
        .from("blog_post_reactions")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", session.user.id)
        .eq("reaction_type", "like")
        .maybeSingle();

      const { data: bookmarkRow } = await supabase
        .from("blog_post_bookmarks")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active) return;
      setLiked(Boolean(likeRow?.id));
      setSaved(Boolean(bookmarkRow?.id));
    }

    load();
    return () => {
      active = false;
    };
  }, [canUse, postId, session?.user?.id]);

  function showToast(message, tone = "info") {
    if (!message) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: String(message), tone });
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  async function ensureProfile(supabase) {
    if (!session?.user) return;
    await supabase.from("user_profiles").upsert(
      {
        id: session.user.id,
        email: session.user.email,
        display_name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "مستخدم",
        avatar_url: session.user.user_metadata?.avatar_url || null,
      },
      { onConflict: "id" }
    );
  }

  async function toggleLike() {
    if (!canUse) return;
    if (!session?.user) {
      window.location.href = "/auth";
      return;
    }

    setPending(true);
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;
      await ensureProfile(supabase);

      if (liked) {
        const { error } = await supabase
          .from("blog_post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", session.user.id)
          .eq("reaction_type", "like");
        if (error) throw error;
        setLiked(false);
        setLikesCount((c) => Math.max(0, (Number(c) || 0) - 1));
        showToast("تم إلغاء الإعجاب", "info");
      } else {
        const { error } = await supabase.from("blog_post_reactions").insert({
          post_id: postId,
          user_id: session.user.id,
          reaction_type: "like",
        });
        if (error) throw error;
        setLiked(true);
        setLikesCount((c) => (Number(c) || 0) + 1);
        showToast("تم الإعجاب بالمنشور", "success");
      }
    } catch (error) {
      showToast("تعذر تحديث الإعجاب", "error");
    } finally {
      setPending(false);
    }
  }

  async function toggleBookmark() {
    if (!canUse) return;
    if (!session?.user) {
      window.location.href = "/auth";
      return;
    }

    setPending(true);
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;
      await ensureProfile(supabase);

      if (saved) {
        const { error } = await supabase.from("blog_post_bookmarks").delete().eq("post_id", postId).eq("user_id", session.user.id);
        if (error) throw error;
        setSaved(false);
        setBookmarksCount((c) => Math.max(0, (Number(c) || 0) - 1));
        showToast("تمت إزالة الحفظ", "info");
      } else {
        const { error } = await supabase.from("blog_post_bookmarks").insert({
          post_id: postId,
          user_id: session.user.id,
          folder: null,
        });
        if (error) throw error;
        setSaved(true);
        setBookmarksCount((c) => (Number(c) || 0) + 1);
        showToast("تم حفظ المنشور", "success");
      }
    } catch (error) {
      showToast("تعذر تحديث الحفظ", "error");
    } finally {
      setPending(false);
    }
  }

  if (!canUse) return null;

  return (
    <>
      <div dir="rtl" className="mt-6 flex w-full flex-wrap items-center justify-start gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={toggleLike}
            disabled={pending}
            aria-pressed={liked}
            aria-label={liked ? `إلغاء الإعجاب (${formatCount(likesCount)})` : `إعجاب (${formatCount(likesCount)})`}
            title={liked ? `إلغاء الإعجاب (${formatCount(likesCount)})` : `إعجاب (${formatCount(likesCount)})`}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${
              liked ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-700"
            }`}
          >
            <HeartIcon filled={liked} className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute -top-2 -right-2 min-w-[1.35rem] rounded-full border border-slate-200 bg-white px-1 text-center text-[11px] font-extrabold text-slate-700 shadow">
            {formatCount(likesCount)}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={toggleBookmark}
            disabled={pending}
            aria-pressed={saved}
            aria-label={saved ? "إزالة من المحفوظات" : "حفظ للقراءة لاحقًا"}
            title={saved ? "إزالة من المحفوظات" : "حفظ للقراءة لاحقًا"}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${
              saved ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-900"
            }`}
          >
            <BookmarkIcon filled={saved} className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute -top-2 -right-2 min-w-[1.35rem] rounded-full border border-slate-200 bg-white px-1 text-center text-[11px] font-extrabold text-slate-700 shadow">
            {formatCount(bookmarksCount)}
          </span>
        </div>
      </div>

      <div
        dir="rtl"
        className={`pointer-events-none fixed bottom-5 right-5 z-[80] transition-all duration-200 ${
          toast ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div
          className={`inline-flex max-w-[min(88vw,520px)] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur ${
            toast?.tone === "success"
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-800"
              : toast?.tone === "error"
                ? "border-red-200 bg-red-50/95 text-red-800"
                : "border-slate-200 bg-white/95 text-slate-800"
          }`}
        >
          <span className="truncate">{toast?.message || ""}</span>
        </div>
      </div>
    </>
  );
}
