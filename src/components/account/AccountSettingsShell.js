"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import { formatArabicDate } from "@/lib/blog/render";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const AVATAR_BUCKET = "avatars";
const POSTS_PER_PAGE = 10;

function AccountStatusPill({ status }) {
  const toneMap = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    published: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
    draft: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const labelMap = {
    pending: "قيد المراجعة",
    published: "مقبول",
    rejected: "مرفوض",
    draft: "مسودة",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${toneMap[status] || toneMap.draft}`}>
      {labelMap[status] || status}
    </span>
  );
}

function AvatarPreview({ src, name }) {
  if (src) {
    return (
      <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        <BlogImage src={src} alt={name || "Avatar"} fill sizes="96px" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-2xl font-black text-slate-500">
      {String(name || "مستخدم").trim().charAt(0)}
    </div>
  );
}

function StatCard({ label, value, tone = "default" }) {
  const toneMap = {
    default: "border-slate-200 bg-white text-slate-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    danger: "border-rose-200 bg-rose-50 text-rose-950",
  };

  return (
    <div className={`rounded-[1.5rem] border p-4 text-right shadow-sm ${toneMap[tone] || toneMap.default}`}>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black">{typeof value === "number" ? value.toLocaleString("ar-MA") : value}</div>
    </div>
  );
}

function LevelPill({ label = "جديد" }) {
  const toneMap = {
    جديد: "border-slate-200 bg-slate-50 text-slate-700",
    مبتدئ: "border-sky-200 bg-sky-50 text-sky-800",
    متوسط: "border-amber-200 bg-amber-50 text-amber-900",
    بارز: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${toneMap[label] || toneMap.جديد}`}>{label}</span>;
}

export default function AccountSettingsShell() {
  const fileInputRef = useRef(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({ displayName: "", email: "", avatarUrl: "" });
  const [memberPosts, setMemberPosts] = useState([]);
  const [memberPostsPage, setMemberPostsPage] = useState(1);
  const [memberPostsTotalCount, setMemberPostsTotalCount] = useState(0);
  const memberPostsTotalPages = Math.max(1, Math.ceil((memberPostsTotalCount || 0) / POSTS_PER_PAGE));
  const [dashboardStats, setDashboardStats] = useState(null);
  const [gamification, setGamification] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [notificationsTotalCount, setNotificationsTotalCount] = useState(0);
  const notificationsTotalPages = Math.max(1, Math.ceil((notificationsTotalCount || 0) / POSTS_PER_PAGE));

  const [myComments, setMyComments] = useState([]);
  const [myCommentsPage, setMyCommentsPage] = useState(1);
  const [myCommentsTotalCount, setMyCommentsTotalCount] = useState(0);
  const myCommentsTotalPages = Math.max(1, Math.ceil((myCommentsTotalCount || 0) / POSTS_PER_PAGE));
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentReplies, setCommentReplies] = useState({});
  const [expandedComments, setExpandedComments] = useState({});

  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksPage, setBookmarksPage] = useState(1);
  const [bookmarksTotalCount, setBookmarksTotalCount] = useState(0);
  const bookmarksTotalPages = Math.max(1, Math.ceil((bookmarksTotalCount || 0) / POSTS_PER_PAGE));
  const [bookmarkFolderFilter, setBookmarkFolderFilter] = useState("");
  const [bookmarkFolders, setBookmarkFolders] = useState([]);
  const [bookmarkFolderDrafts, setBookmarkFolderDrafts] = useState({});
  const [nextEmail, setNextEmail] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function loadMemberPosts(currentUserId, page = 1) {
    const supabase = await getSupabaseClient();
    if (!supabase || !currentUserId) return;

    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data, error: memberPostsError, count } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, status, created_at, review_note", { count: "exact" })
      .eq("author_user_id", currentUserId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (memberPostsError) {
      setError(memberPostsError.message);
      return;
    }

    setMemberPosts(data || []);
    setMemberPostsTotalCount(typeof count === "number" ? count : (data || []).length);
    setMemberPostsPage(safePage);
  }

  async function loadDashboardStats() {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) return;

    const { data, error: statsError } = await supabase.rpc("get_my_dashboard_stats");
    if (statsError) return;

    // RPC returns a single row in an array in JS client.
    const row = Array.isArray(data) ? data[0] : data;
    setDashboardStats(row || null);
  }

  async function loadGamification() {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) return;

    const { data, error: gamificationError } = await supabase.rpc("get_my_gamification_summary");
    if (gamificationError) return;

    const row = Array.isArray(data) ? data[0] : data;
    setGamification(row || null);
  }

  async function loadNotifications(page = 1) {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) return;

    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data, error: notificationsError, count } = await supabase
      .from("user_notifications")
      .select("id, type, title, body, data, is_read, created_at", { count: "exact" })
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (notificationsError) return;
    setNotifications(data || []);
    setNotificationsTotalCount(typeof count === "number" ? count : (data || []).length);
    setNotificationsPage(safePage);
  }

  async function markNotificationRead(notificationId) {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user || !notificationId) return;

    await supabase.from("user_notifications").update({ is_read: true }).eq("id", notificationId).eq("user_id", session.user.id);
    setNotifications((current) => current.map((row) => (row.id === notificationId ? { ...row, is_read: true } : row)));
  }

  async function markAllNotificationsRead() {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) return;

    await supabase.from("user_notifications").update({ is_read: true }).eq("user_id", session.user.id).eq("is_read", false);
    await loadNotifications(notificationsPage);
  }

  async function claimWeeklyReward() {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) return;

    setPending(true);
    setError("");
    setMessage("");
    try {
      const { data, error: claimError } = await supabase.rpc("claim_weekly_challenge_reward");
      if (claimError) throw claimError;
      const row = Array.isArray(data) ? data[0] : data;
      setMessage(row?.message || "تم تحديث المكافأة.");
      await loadGamification();
      await loadDashboardStats();
      await loadNotifications(1);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "تعذر استلام المكافأة.");
    } finally {
      setPending(false);
    }
  }

  async function loadMyComments(page = 1) {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) return;

    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data, error: commentsError, count } = await supabase
      .from("blog_comments")
      .select("id, content, created_at, post_id, parent_comment_id, blog_posts(title, slug)", { count: "exact" })
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (commentsError) return;
    setMyComments(data || []);
    setMyCommentsTotalCount(typeof count === "number" ? count : (data || []).length);
    setMyCommentsPage(safePage);
  }

  async function handleToggleReplies(commentId) {
    if (!commentId) return;

    setExpandedComments((current) => {
      const next = { ...current, [commentId]: !current[commentId] };
      return next;
    });

    if (!commentReplies[commentId]) {
      await loadCommentReplies(commentId);
    }
  }

  async function loadCommentReplies(commentId) {
    const supabase = await getSupabaseClient();
    if (!supabase || !commentId) return;

    const { data } = await supabase
      .from("blog_comments")
      .select("id, content, created_at, user_id, user_profiles(display_name, avatar_url)")
      .eq("parent_comment_id", commentId)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    setCommentReplies((current) => ({ ...current, [commentId]: data || [] }));
  }

  async function handleCommentDelete(commentId) {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) return;

    setPending(true);
    setError("");
    setMessage("");
    try {
      const { error: deleteError } = await supabase.from("blog_comments").delete().eq("id", commentId).eq("user_id", session.user.id);
      if (deleteError) throw deleteError;
      setMessage("تم حذف التعليق.");
      await loadMyComments(myCommentsPage);
      await loadDashboardStats();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف التعليق.");
    } finally {
      setPending(false);
    }
  }

  async function handleCommentEditSave(commentId) {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) return;

    const nextContent = String(commentDraft || "").trim();
    if (nextContent.length < 2) {
      setError("اكتب تعليقا أطول قليلا.");
      return;
    }

    setPending(true);
    setError("");
    setMessage("");
    try {
      const { error: updateError } = await supabase
        .from("blog_comments")
        .update({ content: nextContent })
        .eq("id", commentId)
        .eq("user_id", session.user.id);

      if (updateError) throw updateError;
      setEditingCommentId(null);
      setCommentDraft("");
      setMessage("تم تعديل التعليق.");
      await loadMyComments(myCommentsPage);
      await loadDashboardStats();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "تعذر تعديل التعليق.");
    } finally {
      setPending(false);
    }
  }

  async function loadBookmarks(page = 1, overrideUserId = null) {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    // Avoid relying on possibly-stale React state when called right after auth bootstrap.
    let userId = overrideUserId || session?.user?.id || null;
    if (!userId) {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      userId = currentSession?.user?.id || null;
    }
    if (!userId) return;

    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    let query = supabase
      .from("blog_post_bookmarks")
      .select("id, folder, created_at, post_id, blog_posts(id, slug, title, excerpt, cover_image_url, category)", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const filterFolder = String(bookmarkFolderFilter || "").trim();
    if (filterFolder) query = query.eq("folder", filterFolder);

    const { data, error: bookmarksError, count } = await query.range(from, to);
    if (bookmarksError) return;

    setBookmarks(data || []);
    setBookmarksTotalCount(typeof count === "number" ? count : (data || []).length);
    setBookmarksPage(safePage);

    const { data: folderRows } = await supabase
      .from("blog_post_bookmarks")
      .select("folder")
      .eq("user_id", userId)
      .order("folder", { ascending: true });

    const folders = Array.from(new Set((folderRows || []).map((row) => String(row.folder || "").trim()).filter(Boolean)));
    setBookmarkFolders(folders);
  }

  async function handleBookmarkDelete(bookmarkId) {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) return;

    setPending(true);
    setError("");
    setMessage("");
    try {
      const { error: deleteError } = await supabase.from("blog_post_bookmarks").delete().eq("id", bookmarkId).eq("user_id", session.user.id);
      if (deleteError) throw deleteError;
      setMessage("تم إزالة المقال من القراءة لاحقا.");
      await loadBookmarks(bookmarksPage);
      await loadDashboardStats();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر إزالة الحفظ.");
    } finally {
      setPending(false);
    }
  }

  async function handleBookmarkFolderSave(bookmark) {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user || !bookmark?.id) return;

    const nextFolder = String(bookmarkFolderDrafts[bookmark.id] ?? bookmark.folder ?? "").trim();

    setPending(true);
    setError("");
    setMessage("");
    try {
      const { error: updateError } = await supabase
        .from("blog_post_bookmarks")
        .update({ folder: nextFolder || null })
        .eq("id", bookmark.id)
        .eq("user_id", session.user.id);

      if (updateError) throw updateError;
      setMessage("تم تحديث تصنيف الحفظ.");
      await loadBookmarks(bookmarksPage);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "تعذر تحديث تصنيف الحفظ.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = await getSupabaseClient();
      if (!supabase || !active) return;

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!active) return;
      setSession(currentSession);

      if (!currentSession?.user) return;

      const { data } = await supabase.from("user_profiles").select("display_name, email, avatar_url").eq("id", currentSession.user.id).maybeSingle();
      if (!active) return;

      setProfile({
        displayName: data?.display_name || currentSession.user.user_metadata?.display_name || "",
        email: data?.email || currentSession.user.email || "",
        avatarUrl: data?.avatar_url || "",
      });
      setNextEmail(data?.email || currentSession.user.email || "");
      await loadMemberPosts(currentSession.user.id, 1);
      await loadDashboardStats();
      await loadGamification();
      await loadMyComments(1);
      await loadBookmarks(1, currentSession.user.id);
      await loadNotifications(1);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    // When folder filter changes, reset pagination to page 1 for a predictable UX.
    loadBookmarks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkFolderFilter]);

  async function uploadAvatar(file) {
    const supabase = await getSupabaseClient();
    if (!supabase || !session?.user) throw new Error("تسجيل الدخول مطلوب لرفع الصورة.");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${session.user.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("تعذر إنشاء رابط عام للصورة.");
    return data.publicUrl;
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPending(true);
    setError("");
    setMessage("");

    try {
      const avatarUrl = await uploadAvatar(file);
      setProfile((current) => ({ ...current, avatarUrl }));

      // Persist immediately so it doesn't disappear after refresh.
      const supabase = await getSupabaseClient();
      if (!supabase || !session?.user) throw new Error("تسجيل الدخول مطلوب لرفع الصورة.");

      const nextDisplayName = profile.displayName || session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "مستخدم";
      const nextProfileEmail = nextEmail || profile.email || session.user.email || null;

      const { error: profileError } = await supabase.from("user_profiles").upsert(
        {
          id: session.user.id,
          email: nextProfileEmail,
          display_name: nextDisplayName,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      );
      if (profileError) throw profileError;

      // Keep auth metadata in sync (used by some fallbacks / profile creation flows).
      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl, display_name: nextDisplayName } });

      setMessage("تم حفظ صورة الحساب بنجاح.");
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : "تعذر رفع الصورة.");
    } finally {
      setPending(false);
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    try {
      const supabase = await getSupabaseClient();
      if (!supabase || !session?.user) throw new Error("تسجيل الدخول مطلوب.");

      const { error: profileError } = await supabase.from("user_profiles").upsert(
        {
          id: session.user.id,
          email: nextEmail || profile.email || session.user.email,
          display_name: profile.displayName,
          avatar_url: profile.avatarUrl,
        },
        { onConflict: "id" }
      );
      if (profileError) throw profileError;

      if (nextEmail && nextEmail !== session.user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: nextEmail, data: { display_name: profile.displayName } });
        if (emailError) throw emailError;
      } else {
        const { error: metaError } = await supabase.auth.updateUser({ data: { display_name: profile.displayName } });
        if (metaError) throw metaError;
      }

      setMessage("تم تحديث بيانات الحساب بنجاح.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ بيانات الحساب.");
    } finally {
      setPending(false);
    }
  }

  async function handlePasswordSave(event) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    try {
      const supabase = await getSupabaseClient();
      if (!supabase || !session?.user) throw new Error("تسجيل الدخول مطلوب.");
      const { error: passwordError } = await supabase.auth.updateUser({ password: nextPassword });
      if (passwordError) throw passwordError;

      setNextPassword("");
      setMessage("تم تحديث كلمة المرور بنجاح.");
    } catch (passwordSaveError) {
      setError(passwordSaveError instanceof Error ? passwordSaveError.message : "تعذر تحديث كلمة المرور.");
    } finally {
      setPending(false);
    }
  }

  async function handleLogout() {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  if (!isSupabaseConfigured()) {
    return <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-right text-amber-950">فعّل إعدادات Supabase أولًا حتى تعمل الحسابات.</div>;
  }

  if (!session?.user) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)]">
          <h1 className="text-3xl font-black text-slate-950">الدخول إلى الحساب مطلوب</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">سجل الدخول أولًا حتى تتمكن من إدارة بريدك الإلكتروني وكلمة المرور والاسم والصورة الشخصية.</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Link href="/auth" className="rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800">
              تسجيل الدخول
            </Link>
            <Link href="/" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700">
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside dir="rtl" className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-4">
            <div className="self-end">
              <AvatarPreview src={profile.avatarUrl} name={profile.displayName} />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="self-end rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700"
            >
              رفع صورة أفاتار
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="mt-6">
            <div className="text-xs font-extrabold tracking-[0.2em] text-red-700">WIKIHIS ACCOUNT</div>
            <h1 className="mt-3 text-2xl font-black text-slate-950">{profile.displayName || "حساب المستخدم"}</h1>
            <p className="mt-2 text-sm leading-7 text-slate-600">{profile.email || session.user.email}</p>
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-500">النشر</div>
            <h2 className="mt-2 text-xl font-black text-slate-950">إرسال مقال جديد</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">يمكنك من داخل حسابك الانتقال مباشرة إلى صفحة المساهمين لإرسال المقال ومتابعة حالته.</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Link href="/contributors" className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700">
                المساهمون
              </Link>
              <Link href="/contributors" className="inline-flex rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800">
                نشر مقال
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 w-full rounded-full border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
          >
            تسجيل الخروج
          </button>
        </aside>

        <div className="space-y-6">
          {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">{message}</div> : null}
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">{error}</div> : null}

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={loadDashboardStats}
                disabled={pending}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                تحديث الإحصائيات
              </button>
              <div>
                <div className="text-sm font-semibold text-slate-500">لوحة إحصائيات سريعة</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">نظرة عامة على نشاطك</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="مقالات مقبولة" value={dashboardStats?.published_count ?? 0} tone="success" />
              <StatCard label="قيد المراجعة" value={dashboardStats?.pending_count ?? 0} tone="warning" />
              <StatCard label="مرفوضة" value={dashboardStats?.rejected_count ?? 0} tone="danger" />
              <StatCard label="إجمالي المشاهدات" value={dashboardStats?.total_views ?? 0} />
              <StatCard label="إجمالي الإعجابات" value={dashboardStats?.total_likes ?? 0} />
              <StatCard label="إجمالي التعليقات" value={dashboardStats?.total_comments_received ?? 0} />
              <StatCard label="تعليقاتي" value={dashboardStats?.my_comments_count ?? 0} />
              <StatCard label="محفوظاتي" value={dashboardStats?.my_bookmarks_count ?? 0} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={async () => {
                  await loadGamification();
                  await loadNotifications(1);
                }}
                disabled={pending}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                تحديث التحديات والإشعارات
              </button>
              <div>
                <div className="text-sm font-semibold text-slate-500">المستوى والتحديات</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">نظام الشارات</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-500">مستواك الحالي</div>
                  <div className="flex items-center gap-2">
                    <LevelPill label={gamification?.level_label || "جديد"} />
                    <LevelPill label={gamification?.rank_label || "جديد"} />
                  </div>
                </div>
                <div className="mt-3 text-lg font-black text-slate-950">خبرتك: {(gamification?.total_xp ?? 0).toLocaleString("ar-MA")} XP</div>
                <div className="mt-2 text-sm text-slate-600">عدد المقالات المقبولة: {(gamification?.published_posts ?? 0).toLocaleString("ar-MA")}</div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-right">
                    <div className="text-[11px] font-extrabold tracking-[0.16em] text-red-700">تحدي الأسبوع</div>
                    <div className="mt-1 text-lg font-black text-slate-950">انشر {gamification?.weekly_goal ?? 5} مقالات مقبولة</div>
                  </div>
                  <span className="h-5 w-1 shrink-0 bg-red-700" />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>التقدم</span>
                    <span>
                      {(gamification?.weekly_progress ?? 0).toLocaleString("ar-MA")} / {(gamification?.weekly_goal ?? 5).toLocaleString("ar-MA")}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-red-700"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((Number(gamification?.weekly_progress) || 0) / Math.max(1, Number(gamification?.weekly_goal) || 5)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-slate-600">المكافأة: {(gamification?.weekly_reward_xp ?? 0).toLocaleString("ar-MA")} XP</div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={claimWeeklyReward}
                      disabled={pending || gamification?.weekly_claimed || (Number(gamification?.weekly_progress) || 0) < (Number(gamification?.weekly_goal) || 5)}
                      className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {gamification?.weekly_claimed ? "تم الاستلام" : "استلام المكافأة"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  disabled={pending}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  تعليم الكل كمقروء
                </button>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-500">مركز الإشعارات</div>
                  <div className="mt-1 text-xl font-black text-slate-950">آخر التنبيهات</div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {notifications.length ? (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => markNotificationRead(notif.id)}
                      className={[
                        "w-full rounded-2xl border p-4 text-right transition",
                        notif.is_read ? "border-slate-200 bg-white hover:border-slate-300" : "border-red-200 bg-red-50 hover:border-red-300",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs font-bold text-slate-400">{formatArabicDate(notif.created_at)}</div>
                        <div className="text-sm font-extrabold text-slate-950">{notif.title}</div>
                      </div>
                      {notif.body ? <div className="mt-2 text-sm leading-7 text-slate-600">{notif.body}</div> : null}
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
                    لا توجد إشعارات بعد.
                  </div>
                )}

                {notificationsTotalPages > 1 ? (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                    <button
                      type="button"
                      onClick={() => loadNotifications(Math.max(1, notificationsPage - 1))}
                      disabled={pending || notificationsPage <= 1}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      السابق
                    </button>
                    <div className="text-xs font-bold text-slate-500">
                      صفحة {notificationsPage} من {notificationsTotalPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => loadNotifications(Math.min(notificationsTotalPages, notificationsPage + 1))}
                      disabled={pending || notificationsPage >= notificationsTotalPages}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      التالي
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => loadMyComments(1)}
                disabled={pending}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                تحديث التعليقات
              </button>
              <div>
                <div className="text-sm font-semibold text-slate-500">مركز التعليقات</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">تعليقاتي وردود الآخرين</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {myComments.length ? (
                myComments.map((comment) => {
                  const post = comment.blog_posts;
                  const isEditing = editingCommentId === comment.id;
                  const expanded = Boolean(expandedComments[comment.id]);
                  const replies = commentReplies[comment.id] || [];

                  return (
                    <article key={comment.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                          href={post?.slug ? `/blog/${post.slug}` : "/blog"}
                          className="text-sm font-black text-slate-950 transition hover:text-red-700"
                        >
                          {post?.title || "مقال"}
                        </Link>
                        <div className="text-xs font-semibold text-slate-400">{formatArabicDate(comment.created_at)}</div>
                      </div>

                      {isEditing ? (
                        <>
                          <textarea
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                            rows={4}
                            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-slate-950 outline-none transition focus:border-red-300"
                          />
                          <div className="mt-3 flex flex-row-reverse flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleCommentEditSave(comment.id)}
                              disabled={pending}
                              className="rounded-full bg-red-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              حفظ
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null);
                                setCommentDraft("");
                              }}
                              disabled={pending}
                              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              إلغاء
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{comment.content}</p>
                      )}

                      <div className="mt-4 flex flex-row-reverse flex-wrap items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleReplies(comment.id)}
                          disabled={pending}
                          className="text-xs font-bold text-slate-700 transition hover:text-red-700 disabled:opacity-60"
                        >
                          {expanded ? "إخفاء الردود" : "عرض الردود"}
                        </button>
                        {!isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setCommentDraft(comment.content || "");
                              }}
                              disabled={pending}
                              className="text-xs font-bold text-slate-700 transition hover:text-red-700 disabled:opacity-60"
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCommentDelete(comment.id)}
                              disabled={pending}
                              className="text-xs font-bold text-rose-700 transition hover:text-rose-800 disabled:opacity-60"
                            >
                              حذف
                            </button>
                          </>
                        ) : null}
                      </div>

                      {expanded ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-xs font-black text-slate-700">ردود الآخرين</div>
                          <div className="mt-3 space-y-3">
                            {replies.length ? (
                              replies.map((reply) => (
                                <div key={reply.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="flex flex-row-reverse items-center justify-between gap-3">
                                    <div className="flex flex-row-reverse items-center gap-3">
                                      {reply.user_profiles?.avatar_url ? (
                                        <div className="relative h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                          <BlogImage
                                            src={reply.user_profiles.avatar_url}
                                            alt={reply.user_profiles.display_name || "Avatar"}
                                            fill
                                            sizes="36px"
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-black text-slate-500">
                                          {String(reply.user_profiles?.display_name || "م").trim().charAt(0)}
                                        </div>
                                      )}
                                      <div className="text-sm font-black text-slate-950">{reply.user_profiles?.display_name || "مستخدم"}</div>
                                    </div>
                                    <div className="text-xs font-semibold text-slate-400">{formatArabicDate(reply.created_at)}</div>
                                  </div>
                                  <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{reply.content}</div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                لا توجد ردود بعد.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  لا توجد تعليقات لديك بعد.
                </div>
              )}

              {myCommentsTotalPages > 1 ? (
                <div className="mt-6 flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                  <button
                    type="button"
                    onClick={() => loadMyComments(Math.max(1, myCommentsPage - 1))}
                    disabled={pending || myCommentsPage <= 1}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    السابق
                  </button>
                  <div className="text-xs font-bold text-slate-500">
                    صفحة {myCommentsPage} من {myCommentsTotalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => loadMyComments(Math.min(myCommentsTotalPages, myCommentsPage + 1))}
                    disabled={pending || myCommentsPage >= myCommentsTotalPages}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    التالي
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => loadBookmarks(1)}
                disabled={pending}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                تحديث المحفوظات
              </button>
              <div>
                <div className="text-sm font-semibold text-slate-500">المفضلة والحفظ</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">القراءة لاحقًا</h2>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="block sm:max-w-xs">
                <span className="mb-2 block text-sm font-semibold text-slate-900">تصنيف الحفظ</span>
                <select
                  value={bookmarkFolderFilter}
                  onChange={(event) => setBookmarkFolderFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-slate-950 outline-none transition focus:border-red-300 focus:bg-white"
                >
                  <option value="">كل التصنيفات</option>
                  {bookmarkFolders.map((folder) => (
                    <option key={folder} value={folder}>
                      {folder}
                    </option>
                  ))}
                </select>
              </label>

              {bookmarkFolderFilter ? (
                <button
                  type="button"
                  onClick={() => setBookmarkFolderFilter("")}
                  disabled={pending}
                  className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  إظهار الكل
                </button>
              ) : null}
            </div>

            <div className="mt-6 space-y-4">
              {bookmarks.length ? (
                bookmarks.map((bookmark) => {
                  const post = bookmark.blog_posts;
                  const currentDraft = bookmarkFolderDrafts[bookmark.id] ?? bookmark.folder ?? "";

                  return (
                    <article key={bookmark.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-row-reverse items-start gap-4">
                        {post?.cover_image_url ? (
                          <div className="relative h-20 w-28 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                            <BlogImage src={post.cover_image_url} alt={post.title || "Post"} fill sizes="112px" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-400">
                            بدون صورة
                          </div>
                        )}

                        <div className="min-w-0 flex-1 text-right">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link
                              href={post?.slug ? `/blog/${post.slug}` : "/blog"}
                              className="text-base font-black text-slate-950 transition hover:text-red-700"
                            >
                              {post?.title || "مقال"}
                            </Link>
                            <div className="text-xs font-semibold text-slate-400">{formatArabicDate(bookmark.created_at)}</div>
                          </div>
                          {post?.excerpt ? <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{post.excerpt}</p> : null}

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <label className="block sm:max-w-xs">
                              <span className="mb-2 block text-xs font-bold text-slate-500">تصنيف</span>
                              <input
                                value={currentDraft}
                                onChange={(event) =>
                                  setBookmarkFolderDrafts((current) => ({
                                    ...current,
                                    [bookmark.id]: event.target.value,
                                  }))
                                }
                                placeholder="مثال: المفضلة"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-right text-sm text-slate-950 outline-none transition focus:border-red-300"
                              />
                            </label>

                            <div className="flex flex-row-reverse flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleBookmarkFolderSave(bookmark)}
                                disabled={pending}
                                className="rounded-full bg-red-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                حفظ التصنيف
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBookmarkDelete(bookmark.id)}
                                disabled={pending}
                                className="rounded-full border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                إزالة
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  لا توجد مقالات محفوظة بعد.
                </div>
              )}

              {bookmarksTotalPages > 1 ? (
                <div className="mt-6 flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                  <button
                    type="button"
                    onClick={() => loadBookmarks(Math.max(1, bookmarksPage - 1))}
                    disabled={pending || bookmarksPage <= 1}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  السابق
                </button>
                <div className="text-xs font-bold text-slate-500">
                  صفحة {bookmarksPage} من {bookmarksTotalPages}
                </div>
                  <button
                    type="button"
                    onClick={() => loadBookmarks(Math.min(bookmarksTotalPages, bookmarksPage + 1))}
                    disabled={pending || bookmarksPage >= bookmarksTotalPages}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  التالي
                </button>
              </div>
            ) : null}
            </div>
          </section>

          <form onSubmit={handleProfileSave} className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="text-sm font-semibold text-slate-500">الملف الشخصي</div>
            <h2 className="mt-2 text-3xl font-black text-slate-950">بيانات الحساب</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">الاسم الظاهر</span>
                <input
                  value={profile.displayName}
                  onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-red-300 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">البريد الإلكتروني</span>
                <input
                  type="email"
                  value={nextEmail}
                  onChange={(event) => setNextEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-red-300 focus:bg-white"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-6 rounded-full bg-red-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              حفظ بيانات الحساب
            </button>
          </form>

          <form onSubmit={handlePasswordSave} className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="text-sm font-semibold text-slate-500">الأمان</div>
            <h2 className="mt-2 text-3xl font-black text-slate-950">تغيير كلمة المرور</h2>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">كلمة المرور الجديدة</span>
              <input
                type="password"
                value={nextPassword}
                minLength={6}
                onChange={(event) => setNextPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-red-300 focus:bg-white"
              />
            </label>

            <button
              type="submit"
              disabled={pending || !nextPassword}
              className="mt-6 rounded-full border border-slate-900 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              تحديث كلمة المرور
            </button>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/contributors"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700"
              >
                فتح صفحة النشر
              </Link>
              <div>
                <div className="text-sm font-semibold text-slate-500">طلبات المقالات</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">المقالات المقبولة والمرفوضة</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {memberPosts.length ? (
                memberPosts.map((post) => (
                  <article key={post.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <AccountStatusPill status={post.status} />
                      <div className="text-xs font-semibold text-slate-400">{formatArabicDate(post.created_at)}</div>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950">{post.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                    {post.review_note ? (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
                        {post.review_note}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {post.status === "published" ? (
                        <Link
                          href={`/blog/${post.slug}`}
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700"
                        >
                          عرض المقال
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  لا توجد لديك طلبات مقالات بعد.
                </div>
              )}

              {memberPostsTotalPages > 1 ? (
                <div className="mt-6 flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                  <button
                    type="button"
                    onClick={() => loadMemberPosts(session.user.id, Math.max(1, memberPostsPage - 1))}
                    disabled={pending || memberPostsPage <= 1}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  السابق
                </button>
                <div className="text-xs font-bold text-slate-500">
                  صفحة {memberPostsPage} من {memberPostsTotalPages}
                </div>
                  <button
                    type="button"
                    onClick={() => loadMemberPosts(session.user.id, Math.min(memberPostsTotalPages, memberPostsPage + 1))}
                    disabled={pending || memberPostsPage >= memberPostsTotalPages}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  التالي
                </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

