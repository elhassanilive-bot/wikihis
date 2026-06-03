"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import ContributorsSpotlight from "@/components/blog/ContributorsSpotlight";
import RichTextEditorField from "@/components/blog/RichTextEditorField";
import { getChildCategoryOptions, getParentCategoryOptions, mergeCategoryTree, normalizeCategoryName, resolveCategorySelection } from "@/lib/blog/categories";
import { createSlugCandidate } from "@/lib/blog/slug";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatArabicDate } from "@/lib/blog/render";

const EMPTY_CONTENT = "<p></p>";
const BLOG_MEDIA_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BLOG_BUCKET || "shima-blog-media";
const POSTS_PER_PAGE = 10;
const DRAFT_STORAGE_PREFIX = "WIKIHIS:contrib_draft:";
const CONTRIBUTOR_PRIMARY_CATEGORIES = [
  "الصحة واللياقة",
  "الأخبار",
  "المجتمع",
  "عالم الحيوانات",
  "البيت والأسرة",
  "تكنولوجيا",
  "قضايا المرأة",
];

function generatePostSlug() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  // ASCII-only and URL-safe. Contributors can't edit it.
  return `post-${stamp}`;
}

function ContributorAvatar({ contributor }) {
  if (contributor.avatarUrl) {
    return (
      <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        <BlogImage src={contributor.avatarUrl} alt={contributor.displayName} fill sizes="64px" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xl font-black text-slate-500">
      {String(contributor.displayName || "م").trim().charAt(0)}
    </div>
  );
}

function StatusPill({ status }) {
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

function ContributorCard({ contributor }) {
  return (
    <article dir="rtl" className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-right shadow-[0_20px_55px_-45px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_-40px_rgba(15,23,42,0.35)]">
      <Link href={`/contributors/${contributor.id}`} className="block text-right" dir="rtl">
        <div className="flex items-center gap-4">
          <ContributorAvatar contributor={contributor} />
          <div className="min-w-0 flex-1 text-right">
            <h3 className="text-lg font-black text-slate-950">{contributor.displayName}</h3>
            <div className="mt-1 text-sm font-semibold text-slate-500">{contributor.postsCount} مقال منشور</div>
            <div className="mt-1 text-xs font-semibold text-slate-400">آخر نشر: {formatArabicDate(contributor.lastPublishedAt)}</div>
          </div>
        </div>
        <div className="mt-4 text-right text-xs font-bold text-red-700">عرض صفحة المساهم</div>
      </Link>
    </article>
  );
}

export default function ContributorHub({ contributors = [], categoryTree = [] }) {
  const coverInputRef = useRef(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ownPosts, setOwnPosts] = useState([]);
  const [ownPostsPage, setOwnPostsPage] = useState(1);
  const [ownPostsTotalCount, setOwnPostsTotalCount] = useState(0);
  const ownPostsTotalPages = Math.max(1, Math.ceil((ownPostsTotalCount || 0) / POSTS_PER_PAGE));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);
  const [draftMeta, setDraftMeta] = useState({ hasDraft: false, savedAt: null });
  const draftSaveTimerRef = useRef(null);
  const [coverUpload, setCoverUpload] = useState({ message: "", error: false });
  const [form, setForm] = useState({
    slug: generatePostSlug(),
    title: "",
    excerpt: "",
    coverImageUrl: "",
    categoryParent: "",
    category: "",
    newCategoryParent: "",
    newCategory: "",
    tagsInput: "",
    content: EMPTY_CONTENT,
  });

  const draftStorageKey = useMemo(() => {
    if (!session?.user?.id) return null;
    return `${DRAFT_STORAGE_PREFIX}${session.user.id}:${editingPostId || "new"}`;
  }, [editingPostId, session?.user?.id]);

  const availableCategoryTree = useMemo(
    () =>
      mergeCategoryTree(categoryTree, [
        ...ownPosts.map((post) => ({
          categoryParent: post.category_parent || post.category,
          category: post.category,
        })),
        {
          categoryParent: form.newCategoryParent || form.categoryParent,
          category: form.newCategory || form.category,
        },
      ]),
    [categoryTree, form.category, form.categoryParent, form.newCategory, form.newCategoryParent, ownPosts]
  );
  const parentCategoryOptions = useMemo(() => {
    const options = getParentCategoryOptions(availableCategoryTree);
    return CONTRIBUTOR_PRIMARY_CATEGORIES.filter((name) => options.includes(name));
  }, [availableCategoryTree]);
  const childCategoryOptions = useMemo(
    () => getChildCategoryOptions(form.newCategoryParent || form.categoryParent, availableCategoryTree),
    [availableCategoryTree, form.categoryParent, form.newCategoryParent]
  );

  async function loadOwnPosts(currentUserId, page = 1) {
    const supabase = await getSupabaseClient();
    if (!supabase || !currentUserId) return;

    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data, error: ownPostsError, count } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, status, created_at, published_at, review_note, category, category_parent", { count: "exact" })
      .eq("author_user_id", currentUserId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (ownPostsError) {
      setError(ownPostsError.message);
      return;
    }

    setOwnPosts(data || []);
    setOwnPostsTotalCount(typeof count === "number" ? count : (data || []).length);
    setOwnPostsPage(safePage);
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const supabase = await getSupabaseClient();
      if (!supabase || !active) return;

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!active) return;
      setSession(currentSession);

      if (!currentSession?.user) return;

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("id, display_name, avatar_url, email")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (!active) return;
      setProfile(profileData);
      await loadOwnPosts(currentSession.user.id, 1);
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftStorageKey) return;
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) {
        setDraftMeta({ hasDraft: false, savedAt: null });
        return;
      }

      const parsed = JSON.parse(raw);
      const savedAt = parsed?.savedAt ? new Date(parsed.savedAt) : null;
      setDraftMeta({ hasDraft: true, savedAt: savedAt && !Number.isNaN(savedAt.getTime()) ? savedAt : null });
    } catch {
      setDraftMeta({ hasDraft: false, savedAt: null });
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey) return;
    if (typeof window === "undefined") return;

    // Debounced auto-save
    if (draftSaveTimerRef.current) {
      window.clearTimeout(draftSaveTimerRef.current);
    }

    draftSaveTimerRef.current = window.setTimeout(() => {
      try {
        const payload = {
          savedAt: new Date().toISOString(),
          editingPostId: editingPostId || null,
          form: {
            slug: form.slug,
            title: form.title,
            excerpt: form.excerpt,
            coverImageUrl: form.coverImageUrl,
            categoryParent: form.categoryParent,
            category: form.category,
            newCategoryParent: form.newCategoryParent,
            newCategory: form.newCategory,
            tagsInput: form.tagsInput,
            content: form.content,
          },
        };

        window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
        setDraftMeta({ hasDraft: true, savedAt: new Date(payload.savedAt) });
      } catch {
        // Ignore quota errors
      }
    }, 900);

    return () => {
      if (draftSaveTimerRef.current) {
        window.clearTimeout(draftSaveTimerRef.current);
      }
    };
  }, [
    draftStorageKey,
    editingPostId,
    form.slug,
    form.title,
    form.excerpt,
    form.coverImageUrl,
    form.categoryParent,
    form.category,
    form.newCategoryParent,
    form.newCategory,
    form.tagsInput,
    form.content,
  ]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleParentCategoryChange(value) {
    const nextParent = normalizeCategoryName(value);
    const childOptions = getChildCategoryOptions(nextParent, availableCategoryTree);

    setForm((current) => ({
      ...current,
      categoryParent: nextParent,
      newCategoryParent: "",
      category: childOptions.includes(current.category) ? current.category : nextParent,
      newCategory: "",
    }));
  }

  function handleChildCategoryChange(value) {
    const nextValue = normalizeCategoryName(value);
    setForm((current) => ({
      ...current,
      category: String(nextValue || "").trim() || current.categoryParent,
      newCategory: "",
    }));
  }

  async function handleEditOwnPost(postId) {
    try {
      setPending(true);
      setError("");
      setMessage("");

      const supabase = await getSupabaseClient();
      if (!supabase || !session?.user) throw new Error("يجب تسجيل الدخول أولا.");

      const { data, error: postError } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, content, cover_image_url, category, category_parent, tags, status")
        .eq("id", postId)
        .eq("author_user_id", session.user.id)
        .maybeSingle();

      if (postError) throw postError;
      if (!data) throw new Error("تعذر العثور على المقال.");

      setEditingPostId(data.id);
      const normalizedParent = normalizeCategoryName(data.category_parent || data.category || "");
      const normalizedCategory = normalizeCategoryName(data.category || data.category_parent || "");
      setForm((current) => ({
        ...current,
        slug: data.slug || current.slug,
        title: data.title || "",
        excerpt: data.excerpt || "",
        coverImageUrl: data.cover_image_url || "",
        categoryParent: normalizedParent,
        category: normalizedCategory,
        newCategoryParent: "",
        newCategory: "",
        tagsInput: Array.isArray(data.tags) ? data.tags.join(", ") : "",
        content: data.content || EMPTY_CONTENT,
      }));

      setCoverUpload({ message: "", error: false });
      setMessage("أنت الآن تقوم بتعديل المقال. عند الحفظ سيتم إرساله للمراجعة من جديد.");
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "تعذر فتح المقال للتعديل.");
    } finally {
      setPending(false);
    }
  }

  function handleCancelEdit() {
    setEditingPostId(null);
    setForm({
      slug: generatePostSlug(),
      title: "",
      excerpt: "",
      coverImageUrl: "",
      categoryParent: "",
      category: "",
      newCategoryParent: "",
      newCategory: "",
      tagsInput: "",
      content: EMPTY_CONTENT,
    });
    setCoverUpload({ message: "", error: false });
  }

  function restoreLastDraft() {
    if (!draftStorageKey || typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const nextForm = parsed?.form;
      if (!nextForm) return;

      setForm((current) => ({
        ...current,
        ...nextForm,
      }));
      setMessage("تم استرجاع آخر نسخة محفوظة من المسودة.");
    } catch {
      setError("تعذر استرجاع المسودة.");
    }
  }

  function clearDraft() {
    if (!draftStorageKey || typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch {
      // ignore
    }
    setDraftMeta({ hasDraft: false, savedAt: null });
  }

  async function uploadCoverFile(file) {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error("ربط Supabase غير متاح.");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `covers/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(BLOG_MEDIA_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BLOG_MEDIA_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("تعذر إنشاء رابط عام لصورة الغلاف.");

    return data.publicUrl;
  }

  async function handleCoverSelection(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setCoverUpload({ message: "جارٍ رفع صورة الغلاف...", error: false });
      const publicUrl = await uploadCoverFile(file);
      updateField("coverImageUrl", publicUrl);
      setCoverUpload({ message: "تم رفع صورة الغلاف بنجاح.", error: false });
    } catch (coverError) {
      setCoverUpload({
        message: coverError instanceof Error ? coverError.message : "تعذر رفع صورة الغلاف.",
        error: true,
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error("ربط Supabase غير متاح.");
      if (!session?.user) throw new Error("يجب تسجيل الدخول أولًا حتى تتمكن من النشر.");

      const categorySelection = resolveCategorySelection(form.categoryParent, form.category, form.newCategoryParent, form.newCategory);
      const slug = form.slug || generatePostSlug();
      const tags = form.tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const authorDisplayName = profile?.display_name || session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "مساهم";
      const authorAvatarUrl = profile?.avatar_url || "";

      await supabase.from("user_profiles").upsert(
        {
          id: session.user.id,
          email: session.user.email,
          display_name: authorDisplayName,
          avatar_url: authorAvatarUrl,
        },
        { onConflict: "id" }
      );

      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        cover_image_url: form.coverImageUrl || null,
        category: categorySelection.category || null,
        category_parent: categorySelection.categoryParent || null,
        category_slug: createSlugCandidate(categorySelection.category || ""),
        tags,
        status: "pending",
        reviewed_at: null,
        review_note: null,
        author_user_id: session.user.id,
        author_display_name: authorDisplayName,
        author_avatar_url: authorAvatarUrl,
      };

      const writeResult = editingPostId
        ? await supabase.from("blog_posts").update(payload).eq("id", editingPostId).eq("author_user_id", session.user.id)
        : await supabase.from("blog_posts").insert({ ...payload, slug });

      const insertError = writeResult.error;

      if (insertError) throw insertError;

      const wasEditing = Boolean(editingPostId);
      setEditingPostId(null);

      setForm({
        slug: generatePostSlug(),
        title: "",
        excerpt: "",
        coverImageUrl: "",
        categoryParent: "",
        category: "",
        newCategoryParent: "",
        newCategory: "",
        tagsInput: "",
        content: EMPTY_CONTENT,
      });
      setCoverUpload({ message: "", error: false });
      setMessage(wasEditing ? "تم حفظ التعديلات وإرسال المقال للمراجعة." : "تم إرسال المقال للمراجعة. سيظهر في الموقع بعد موافقة الإدارة.");
      await loadOwnPosts(session.user.id, ownPostsPage);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "تعذر إرسال المقال.");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteOwnPost(postId) {
    try {
      setPending(true);
      setError("");
      setMessage("");

      const supabase = await getSupabaseClient();
      if (!supabase || !session?.user) throw new Error("يجب تسجيل الدخول أولًا.");

      const { error: deleteError } = await supabase.from("blog_posts").delete().eq("id", postId).eq("author_user_id", session.user.id);
      if (deleteError) throw deleteError;

      setMessage("تم حذف مقالتك بنجاح.");
      await loadOwnPosts(session.user.id, ownPostsPage);
    } catch (deleteOwnError) {
      setError(deleteOwnError instanceof Error ? deleteOwnError.message : "تعذر حذف المقال.");
    } finally {
      setPending(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-right text-amber-950">فعّل Supabase أولًا حتى تعمل صفحة المساهمين.</div>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="text-right">
            <div className="text-xs font-extrabold tracking-[0.2em] text-red-700">WIKIHIS CONTRIBUTORS</div>
            <h1 className="mt-2 text-3xl font-black text-slate-950">المساهمون</h1>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-slate-600">يعرض هذا القسم جميع الناشرين في الموقع، ومع تسجيل الدخول يمكن لأي مساهم إرسال مقاله للمراجعة قبل النشر العام.</p>
          </div>
          {session?.user ? (
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">تم تسجيل الدخول كمساهم</div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link href="/auth" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700">تسجيل الدخول</Link>
              <Link href="/auth?mode=signup" className="rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800">إنشاء حساب</Link>
            </div>
          )}
        </div>

        <div className="mt-6">
          <ContributorsSpotlight
            contributors={contributors}
            title="الناشرون الأكثر نشرًا"
            description="يعرض هذا القسم المساهمين الذين نُشرت مقالاتهم فعلًا في الموقع، وليس جميع المسجلين فقط."
            limit={6}
            compact
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contributors.map((contributor) => (
            <ContributorCard key={contributor.id} contributor={contributor} />
          ))}
        </div>
      </section>

      {session?.user ? (
        <>
          {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-right text-sm text-emerald-900">{message}</div> : null}
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-right text-sm text-rose-900">{error}</div> : null}

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_380px]">
            <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)] sm:p-8">
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelection} />
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-500">نشر كمساهم</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">إرسال مقال جديد للمراجعة</h2>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-right text-xs font-semibold text-slate-600">
                  {draftMeta.hasDraft ? (
                    <span>
                      تم حفظ المسودة تلقائيا{draftMeta.savedAt ? ` · آخر حفظ: ${draftMeta.savedAt.toLocaleString("ar-MA")}` : ""}
                    </span>
                  ) : (
                    <span className="text-slate-500">يتم حفظ المسودة تلقائيا أثناء الكتابة.</span>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={restoreLastDraft}
                    disabled={!draftMeta.hasDraft}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    استرجاع آخر نسخة
                  </button>
                  <button
                    type="button"
                    onClick={clearDraft}
                    disabled={!draftMeta.hasDraft}
                    className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    حذف المسودة
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">عنوان المقال</span>
                  <input value={form.title} onChange={(event) => updateField("title", event.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-red-300 focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">Slug</span>
                  <input value={form.slug} readOnly disabled dir="ltr" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none" />
                  <span className="mt-2 block text-xs font-semibold text-slate-500">الرابط ثابت ولا يمكن تغييره من طرف المساهم.</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">الوسوم</span>
                  <input value={form.tagsInput} onChange={(event) => updateField("tagsInput", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-red-300 focus:bg-white" placeholder="تقنية، اقتصاد، تحليل" />
                </label>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">ملخص المقال</span>
                <textarea value={form.excerpt} onChange={(event) => updateField("excerpt", event.target.value)} required rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-red-300 focus:bg-white" />
              </label>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">التصنيف الرئيسي</span>
                  <select value={form.categoryParent} onChange={(event) => handleParentCategoryChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-red-300 focus:bg-white">
                    <option value="">اختر التصنيف الرئيسي</option>
                    {parentCategoryOptions.map((parentName) => (
                      <option key={parentName} value={parentName}>{parentName}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">إضافة تصنيف رئيسي جديد</span>
                  <input
                    value={form.newCategoryParent}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        newCategoryParent: event.target.value,
                        categoryParent: "",
                        category: "",
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white"
                    placeholder="مثل: العلوم، القانون، الأطفال"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">التصنيف الفرعي</span>
                  <select
                    value={childCategoryOptions.includes(form.category) ? form.category : ""}
                    onChange={(event) => handleChildCategoryChange(event.target.value)}
                    disabled={!(form.newCategoryParent || form.categoryParent) || childCategoryOptions.length === 0}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-red-300 focus:bg-white"
                  >
                    <option value="">{childCategoryOptions.length ? "اختر التصنيف الفرعي" : "لا توجد تصنيفات فرعية"}</option>
                    {childCategoryOptions.map((child) => (
                      <option key={child} value={child}>{child}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">إضافة تصنيف فرعي جديد</span>
                  <input
                    value={form.newCategory}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        newCategory: event.target.value,
                        category: "",
                      }))
                    }
                    disabled={!(form.newCategoryParent || form.categoryParent)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 focus:border-red-300 focus:bg-white"
                    placeholder="مثل: الفضاء، التحفيز، التغذية العلاجية"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800">
                    رفع صورة الغلاف
                  </button>
                  <span className="text-sm text-slate-500">يمكنك رفع صورة غلاف لمقالك قبل إرساله للمراجعة.</span>
                </div>
                {coverUpload.message ? (
                  <div className={coverUpload.error ? "pt-3 text-sm text-rose-700" : "pt-3 text-sm text-emerald-700"}>{coverUpload.message}</div>
                ) : null}
                {form.coverImageUrl ? (
                  <div className="relative mt-4 h-56 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                    <BlogImage src={form.coverImageUrl} alt={form.title || "Cover preview"} fill sizes="(max-width: 768px) 100vw, 50vw" className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>

              <div className="mt-6">
                <RichTextEditorField value={form.content} onChange={(html) => updateField("content", html)} />
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                {editingPostId ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={pending}
                    className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    إلغاء التعديل
                  </button>
                ) : null}
                <button type="submit" disabled={pending} className="rounded-full bg-red-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70">
                  {pending ? "جارٍ الحفظ..." : editingPostId ? "حفظ التعديلات وإرسال للمراجعة" : "إرسال المقال للمراجعة"}
                </button>
              </div>
            </form>

            <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)] sm:p-8">
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-500">مقالاتي</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">إدارة مقالاتي</h2>
              </div>

              <div className="mt-6 space-y-4">
                {ownPosts.length ? (
                  ownPosts.map((post) => (
                    <article key={post.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 text-right">
                      <div className="flex items-center justify-between gap-3">
                        <StatusPill status={post.status} />
                        <div className="text-xs font-semibold text-slate-400">{formatArabicDate(post.created_at)}</div>
                      </div>
                      <h3 className="mt-3 text-lg font-black text-slate-950">{post.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                      {post.review_note ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{post.review_note}</div> : null}
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        {post.status === "published" ? (
                          <Link href={`/blog/${post.slug}`} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700">
                            عرض المقال
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleEditOwnPost(post.id)}
                          disabled={pending}
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOwnPost(post.id)}
                          disabled={pending}
                          className="rounded-full border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          حذف مقالتي
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                    لم ترسل أي مقالات بعد.
                  </div>
                )}

                {ownPostsTotalPages > 1 ? (
                  <div className="mt-6 flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                    <button
                      type="button"
                      onClick={() => loadOwnPosts(session.user.id, Math.max(1, ownPostsPage - 1))}
                      disabled={pending || ownPostsPage <= 1}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      السابق
                    </button>
                    <div className="text-xs font-bold text-slate-500">
                      صفحة {ownPostsPage} من {ownPostsTotalPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => loadOwnPosts(session.user.id, Math.min(ownPostsTotalPages, ownPostsPage + 1))}
                      disabled={pending || ownPostsPage >= ownPostsTotalPages}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      التالي
                    </button>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
