"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RichTextEditorField from "@/components/blog/RichTextEditorField";
import BlogImage from "@/components/blog/BlogImage";
import { getChildCategoryOptions, getParentCategoryOptions, mergeCategoryTree, resolveCategorySelection } from "@/lib/blog/categories";
import { createSlugCandidate } from "@/lib/blog/slug";
import { prepareBlogContentForEditor } from "@/lib/blog/content";
import { getSupabaseClient } from "@/lib/supabase/client";

const EMPTY_CONTENT = "<p></p>";
const BLOG_MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BLOG_BUCKET === "shima-blog-media"
    ? "blog-media"
    : process.env.NEXT_PUBLIC_SUPABASE_BLOG_BUCKET || "blog-media";
const INITIAL_VISIBLE_POSTS = 10;

function stripHtmlToText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWordCount(value) {
  return stripHtmlToText(value).split(/\s+/).filter(Boolean).length;
}

function getPostQualityScore(post) {
  const titleLength = String(post?.title || "").trim().length;
  const excerptLength = String(post?.excerpt || "").trim().length;
  const wordCount = getWordCount(post?.content);
  const checks = [
    titleLength >= 35 && titleLength <= 70,
    excerptLength >= 90 && excerptLength <= 160,
    Boolean(String(post?.coverImageUrl || "").trim()),
    Boolean(post?.category),
    Array.isArray(post?.tags) && post.tags.length >= 2,
    wordCount >= 300,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function formatNumber(value) {
  return new Intl.NumberFormat("ar").format(Number(value) || 0);
}

function createEmptyForm() {
  return {
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    coverImageUrl: "",
    categoryParent: "",
    category: "",
    newCategoryParent: "",
    newCategory: "",
    tagsInput: "",
    adminToken: "",
    content: EMPTY_CONTENT,
  };
}

function SubmitButton({ pending, editing }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-w-32 items-center justify-center rounded-xl bg-[var(--blog-accent)] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[var(--blog-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
    >
      {pending ? "جارٍ حفظ المقال..." : editing ? "حفظ التعديلات" : "نشر المقال"}
    </button>
  );
}

function StatusBadge({ status }) {
  const current = status || "published";
  const tone =
    current === "published"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{current}</span>;
}

function DeletePostModal({ post, pending, onCancel, onConfirm }) {
  if (!post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-950">تأكيد حذف المقال</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              سيتم حذف المقال <span className="font-semibold text-slate-900">{post.title}</span> من لوحة النشر. هذا الإجراء لا يمكن التراجع عنه.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
          الرابط المختصر الحالي: <span className="font-semibold">/{post.slug}</span>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "جارٍ الحذف..." : "تأكيد الحذف"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkDeleteModal({ count, categoryLabel, pending, onCancel, onConfirm }) {
  if (!count) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-950">تأكيد الحذف الجماعي</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              سيتم حذف <span className="font-semibold text-slate-900">{count}</span> مقال دفعة واحدة
              {categoryLabel ? (
                <>
                  {" "}
                  من تصنيف <span className="font-semibold text-slate-900">{categoryLabel}</span>
                </>
              ) : null}
              . هذا الإجراء لا يمكن التراجع عنه.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-900">
          استخدم هذا الخيار بعد التحقق من التحديد الحالي أو بعد اختيار التصنيف الذي تريد تنظيفه بالكامل.
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "جارٍ حذف المقالات..." : "تأكيد الحذف الجماعي"}
          </button>
        </div>
      </div>
    </div>
  );
}

function mapPostToForm(post, adminToken) {
  return {
    id: post.id || "",
    title: post.title || "",
    slug: post.slug || "",
    excerpt: post.excerpt || "",
    coverImageUrl: post.coverImageUrl || "",
    categoryParent: post.categoryParent || post.category || "",
    category: post.category || "",
    newCategoryParent: "",
    newCategory: "",
    tagsInput: Array.isArray(post.tags) ? post.tags.join(", ") : "",
    adminToken: adminToken || "",
    content: prepareBlogContentForEditor(post.content),
  };
}

export default function AdminBlogDashboard({
  posts = [],
  categoryTree = [],
  saveAction,
  deleteAction,
  bulkDeleteAction,
  publishingEnabled,
  requiresToken,
  adminListError,
}) {
  const router = useRouter();
  const coverInputRef = useRef(null);
  const [form, setForm] = useState(createEmptyForm);
  const [manualSlug, setManualSlug] = useState(false);
  const [flash, setFlash] = useState({ type: "", message: "", slug: "" });
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [coverUpload, setCoverUpload] = useState({ message: "", error: false });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const editing = Boolean(form.id);
  const visibleSlug = manualSlug ? form.slug : createSlugCandidate(form.title);
  const availableCategoryTree = useMemo(
    () =>
      mergeCategoryTree(categoryTree, [
        ...posts.map((post) => ({
          categoryParent: post.categoryParent || post.category,
          category: post.category,
        })),
        {
          categoryParent: form.newCategoryParent || form.categoryParent,
          category: form.newCategory || form.category,
        },
      ]),
    [categoryTree, form.category, form.categoryParent, form.newCategory, form.newCategoryParent, posts]
  );
  const parentCategoryOptions = useMemo(() => getParentCategoryOptions(availableCategoryTree), [availableCategoryTree]);
  const childCategoryOptions = useMemo(
    () => getChildCategoryOptions(form.newCategoryParent || form.categoryParent, availableCategoryTree),
    [availableCategoryTree, form.categoryParent, form.newCategoryParent]
  );

  const categories = useMemo(() => {
    return [...new Set(posts.map((post) => post.category).filter(Boolean))];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const term = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesCategory = categoryFilter === "all" ? true : post.category === categoryFilter;
      if (!matchesCategory) return false;
      if (!term) return true;

      const haystack = [post.title, post.excerpt, post.slug, post.category, ...(post.tags || [])]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [categoryFilter, posts, query]);

  const tagsPreview = useMemo(
    () =>
      form.tagsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6),
    [form.tagsInput]
  );
  const visiblePosts = showAllPosts ? filteredPosts : filteredPosts.slice(0, INITIAL_VISIBLE_POSTS);
  const hasMorePosts = filteredPosts.length > INITIAL_VISIBLE_POSTS;
  const allFilteredIds = useMemo(() => filteredPosts.map((post) => post.id), [filteredPosts]);
  const allVisibleIds = useMemo(() => visiblePosts.map((post) => post.id), [visiblePosts]);
  const currentCategoryIds = useMemo(
    () => (categoryFilter === "all" ? [] : posts.filter((post) => post.category === categoryFilter).map((post) => post.id)),
    [categoryFilter, posts]
  );
  const allFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedPostIds.includes(id));

  const titleWords = useMemo(() => form.title.trim().split(/\s+/).filter(Boolean).length, [form.title]);
  const seoChecklist = useMemo(() => {
    const plainContent = String(form.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const titleLength = form.title.trim().length;
    const excerptLength = form.excerpt.trim().length;
    const checks = [
      { label: "عنوان واضح بين 35 و70 حرفاً", passed: titleLength >= 35 && titleLength <= 70 },
      { label: "وصف مختصر بين 90 و160 حرفاً", passed: excerptLength >= 90 && excerptLength <= 160 },
      { label: "رابط slug قابل للقراءة", passed: Boolean(visibleSlug && visibleSlug.length >= 5) },
      { label: "صورة غلاف للمقال", passed: Boolean(String(form.coverImageUrl || "").trim()) },
      {
        label: "تصنيف ووسومان على الأقل",
        passed: Boolean(form.category || form.newCategory || form.categoryParent || form.newCategoryParent) && tagsPreview.length >= 2,
      },
      { label: "محتوى غني لا يقل عن 300 كلمة", passed: plainContent.split(/\s+/).filter(Boolean).length >= 300 },
    ];
    const passedCount = checks.filter((item) => item.passed).length;
    return { checks, score: Math.round((passedCount / checks.length) * 100) };
  }, [
    form.category,
    form.categoryParent,
    form.content,
    form.coverImageUrl,
    form.excerpt,
    form.newCategory,
    form.newCategoryParent,
    form.title,
    tagsPreview.length,
    visibleSlug,
  ]);
  const contentReview = useMemo(() => {
    const plainContent = stripHtmlToText(form.content);
    const contentWords = plainContent.split(/\s+/).filter(Boolean).length;
    const title = form.title.trim().toLowerCase();
    const excerpt = form.excerpt.trim().toLowerCase();
    const hasHeadings = /<h[2-3][^>]*>/i.test(String(form.content || ""));
    const hasInternalLinks = /href=["']\/blog\//i.test(String(form.content || ""));
    const duplicateTitle = title
      ? posts.some((post) => post.id !== form.id && String(post.title || "").trim().toLowerCase() === title)
      : false;
    const duplicateExcerpt = excerpt
      ? posts.some((post) => post.id !== form.id && String(post.excerpt || "").trim().toLowerCase() === excerpt)
      : false;

    return [
      { label: "العنوان غير مكرر داخل الموقع", passed: !duplicateTitle },
      { label: "الوصف غير مكرر داخل الموقع", passed: !duplicateExcerpt },
      { label: "المقال لا يقل عن 300 كلمة", passed: contentWords >= 300 },
      { label: "يحتوي على عناوين فرعية H2/H3", passed: hasHeadings },
      { label: "يحتوي على روابط داخلية لمقالات ويكيهيس", passed: hasInternalLinks },
    ];
  }, [form.content, form.excerpt, form.id, form.title, posts]);
  const internalLinkSuggestions = useMemo(() => {
    const tokens = [
      ...form.title.split(/\s+/),
      ...form.excerpt.split(/\s+/),
      form.category,
      form.categoryParent,
      ...tagsPreview,
    ]
      .map((item) => String(item || "").trim().toLowerCase())
      .filter((item) => item.length > 3);

    return posts
      .filter((post) => post.id !== form.id && post.slug)
      .map((post) => {
        const haystack = [post.title, post.excerpt, post.category, post.categoryParent, ...(post.tags || [])].join(" ").toLowerCase();
        const score =
          (post.category && (post.category === form.category || post.category === form.categoryParent) ? 4 : 0) +
          tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);

        return { post, score };
      })
      .filter((item) => item.score > 0)
      .sort((first, second) => second.score - first.score)
      .slice(0, 5)
      .map((item) => item.post);
  }, [form.category, form.categoryParent, form.excerpt, form.id, form.title, posts, tagsPreview]);
  const analyticsSummary = useMemo(() => {
    const publishedPosts = posts.filter((post) => post.status === "published");
    const totalViews = posts.reduce((sum, post) => sum + (Number(post.viewCount) || 0), 0);
    const topPosts = [...posts]
      .sort((first, second) => (Number(second.viewCount) || 0) - (Number(first.viewCount) || 0))
      .slice(0, 5);
    const averageQuality = posts.length
      ? Math.round(posts.reduce((sum, post) => sum + getPostQualityScore(post), 0) / posts.length)
      : 0;
    const engagementRate = publishedPosts.length ? Math.round(totalViews / publishedPosts.length) : 0;

    return {
      totalPosts: posts.length,
      publishedCount: publishedPosts.length,
      totalViews,
      engagementRate,
      averageQuality,
      topPosts,
    };
  }, [posts]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleParentCategoryChange(value) {
    const nextParent = String(value || "");
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
    setForm((current) => ({
      ...current,
      category: String(value || "").trim() || current.categoryParent,
      newCategory: "",
    }));
  }

  async function uploadCoverFile(file) {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase غير مُعد. أضف المفاتيح أولًا.");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `covers/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(BLOG_MEDIA_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      throw new Error(
        `تعذر رفع صورة الغلاف إلى bucket "${BLOG_MEDIA_BUCKET}". شغّل supabase/blog_storage.sql أو تأكد من اسم الـ bucket في .env.local.`
      );
    }

    const { data } = supabase.storage.from(BLOG_MEDIA_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) {
      throw new Error("تم الرفع لكن تعذر إنشاء الرابط العام لصورة الغلاف.");
    }

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
    } catch (error) {
      setCoverUpload({
        message: error instanceof Error ? error.message : "تعذر رفع صورة الغلاف.",
        error: true,
      });
    }
  }

  function resetForm(keepToken = true) {
    setForm((current) => ({
      ...createEmptyForm(),
      adminToken: keepToken ? current.adminToken : "",
    }));
    setManualSlug(false);
  }

  function handleEdit(post) {
    setForm((current) => mapPostToForm(post, current.adminToken));
    setManualSlug(true);
    setFlash({ type: "", message: "", slug: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("id", form.id);
    formData.set("title", form.title);
    formData.set("slug", visibleSlug);
    formData.set("excerpt", form.excerpt);
    formData.set("coverImageUrl", form.coverImageUrl);
    const categorySelection = resolveCategorySelection(form.categoryParent, form.category, form.newCategoryParent, form.newCategory);
    formData.set("categoryParent", categorySelection.categoryParent || "");
    formData.set("category", categorySelection.category || "");
    formData.set("categorySlug", createSlugCandidate(categorySelection.category || ""));
    formData.set("tags", form.tagsInput);
    formData.set("content", form.content);
    formData.set("adminToken", form.adminToken);

    startSaveTransition(() => {
      saveAction(formData).then((result) => {
        if (!result?.ok) {
          setFlash({
            type: "error",
            message: result?.error || "تعذر حفظ المقال.",
            slug: "",
          });
          return;
        }

        setFlash({
          type: "success",
          message: editing ? "تم تحديث المقال بنجاح." : "تم نشر المقال بنجاح.",
          slug: result.slug || "",
        });
        resetForm();
        router.refresh();
      });
    });
  }

  function handleDelete(post) {
    setDeleteTarget(post);
  }

  function togglePostSelection(postId) {
    setSelectedPostIds((current) => (current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId]));
  }

  function selectIds(ids) {
    setSelectedPostIds([...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))]);
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      setSelectedPostIds((current) => current.filter((id) => !allFilteredIds.includes(id)));
      return;
    }

    setSelectedPostIds((current) => [...new Set([...current, ...allFilteredIds])]);
  }

  function openBulkDeleteModal(ids, categoryLabel = "") {
    const normalizedIds = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];

    if (!normalizedIds.length) {
      setFlash({
        type: "error",
        message: "حدد المقالات التي تريد حذفها أولًا.",
        slug: "",
      });
      return;
    }

    setBulkDeleteTarget({ ids: normalizedIds, categoryLabel });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(() => {
      deleteAction({ id: deleteTarget.id, adminToken: form.adminToken }).then((result) => {
        if (!result?.ok) {
          setFlash({
            type: "error",
            message: result?.error || "تعذر حذف المقال.",
            slug: "",
          });
          return;
        }

        if (form.id === deleteTarget.id) {
          resetForm();
        }

        setFlash({
          type: "success",
          message: "تم حذف المقال بنجاح.",
          slug: "",
        });
        setDeleteTarget(null);
        router.refresh();
      });
    });
  }

  function confirmBulkDelete() {
    if (!bulkDeleteTarget?.ids?.length) return;

    startDeleteTransition(() => {
      bulkDeleteAction({ ids: bulkDeleteTarget.ids, adminToken: form.adminToken }).then((result) => {
        if (!result?.ok) {
          setFlash({
            type: "error",
            message: result?.error || "تعذر حذف المقالات المحددة.",
            slug: "",
          });
          return;
        }

        if (bulkDeleteTarget.ids.includes(form.id)) {
          resetForm();
        }

        setSelectedPostIds((current) => current.filter((id) => !bulkDeleteTarget.ids.includes(id)));
        setBulkDeleteTarget(null);
        setFlash({
          type: "success",
          message: `تم حذف ${result.deletedCount || bulkDeleteTarget.ids.length} مقال بنجاح.`,
          slug: "",
        });
        router.refresh();
      });
    });
  }

  return (
    <div className="space-y-8">
      <DeletePostModal
        post={deleteTarget}
        pending={isDeleting}
        onCancel={() => (isDeleting ? null : setDeleteTarget(null))}
        onConfirm={confirmDelete}
      />
      <BulkDeleteModal
        count={bulkDeleteTarget?.ids?.length || 0}
        categoryLabel={bulkDeleteTarget?.categoryLabel || ""}
        pending={isDeleting}
        onCancel={() => (isDeleting ? null : setBulkDeleteTarget(null))}
        onConfirm={confirmBulkDelete}
      />
      <section className="overflow-hidden rounded-[1.75rem] border border-orange-100 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_28%),linear-gradient(135deg,#fff7ed_0%,#ffffff_52%,#f8fafc_100%)] shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">لوحة نشر المقالات</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[112px] rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-center shadow-sm backdrop-blur">
              <div className="text-[11px] font-semibold text-slate-500">المقالات</div>
              <div className="mt-1 text-xl font-black text-slate-950">{posts.length}</div>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 sm:text-sm"
            >
              معاينة المدونة
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 sm:text-sm"
            >
              لوحة الأدمن
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "إجمالي المقالات", value: formatNumber(analyticsSummary.totalPosts), note: "كل الحالات" },
          { label: "المنشور", value: formatNumber(analyticsSummary.publishedCount), note: "ظاهر للقراء" },
          { label: "المشاهدات", value: formatNumber(analyticsSummary.totalViews), note: "حسب view_count" },
          { label: "متوسط التفاعل", value: formatNumber(analyticsSummary.engagementRate), note: "مشاهدات لكل مقال" },
          { label: "جودة المحتوى", value: `${formatNumber(analyticsSummary.averageQuality)}%`, note: "متوسط SEO والتحرير" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_20px_55px_-48px_rgba(15,23,42,0.45)]">
            <div className="text-xs font-bold text-slate-500">{metric.label}</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{metric.value}</div>
            <div className="mt-1 text-xs text-slate-500">{metric.note}</div>
          </div>
        ))}
      </section>

      {analyticsSummary.topPosts.length ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-500">الأكثر قراءة</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">مقالات تقود التفاعل</h2>
            </div>
            <div className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-700">تحليلات مباشرة</div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {analyticsSummary.topPosts.map((post, index) => (
              <Link
                key={post.id || post.slug}
                href={`/blog/${post.slug}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right transition hover:border-red-200 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-black text-white">#{index + 1}</span>
                  <span className="text-xs font-bold text-slate-500">{formatNumber(post.viewCount)} مشاهدة</span>
                </div>
                <div className="mt-3 line-clamp-2 text-sm font-black leading-6 text-slate-950">{post.title}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!publishingEnabled ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950">
          النشر المباشر من هذه اللوحة يحتاج `SUPABASE_SERVICE_ROLE_KEY` داخل `.env.local` ثم إعادة تشغيل السيرفر.
        </div>
      ) : null}

      {adminListError ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950">
          تعذر تحميل قائمة المقالات كاملة: {adminListError}
        </div>
      ) : null}

      {flash.message ? (
        <div
          className={[
            "rounded-[2rem] px-6 py-5",
            flash.type === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-900"
              : "border border-emerald-200 bg-emerald-50 text-emerald-900",
          ].join(" ")}
        >
          {flash.message}
          {flash.slug ? (
            <>
              {" "}
              <Link href={`/blog/${flash.slug}`} className="font-semibold underline underline-offset-4">
                افتح المقال
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.35)] sm:p-8">
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelection} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-500">محرر المقال</div>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{editing ? "تعديل المقال" : "إضافة مقال جديد"}</h2>
            </div>
            {editing ? (
              <button
                type="button"
                onClick={() => resetForm()}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 sm:text-sm"
              >
                مقال جديد
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">عنوان المقال</span>
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
                placeholder="مثال: كيف تبني غرفة أخبار رقمية قابلة للتوسع؟"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">Slug</span>
              <input
                value={visibleSlug}
                onChange={(event) => {
                  setManualSlug(true);
                  updateField("slug", createSlugCandidate(event.target.value));
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
                dir="ltr"
                placeholder="auto-generated-post-slug"
              />
            </label>
          </div>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold text-slate-900">الملخص</span>
            <textarea
              value={form.excerpt}
              onChange={(event) => updateField("excerpt", event.target.value)}
              required
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
              placeholder="ملخص قصير واحترافي يظهر في بطاقات المقال ونتائج المشاركة."
            />
          </label>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">صورة الغلاف</span>
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-4">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    رفع صورة الغلاف
                  </button>
                  {form.coverImageUrl ? (
                    <button
                      type="button"
                      onClick={() => updateField("coverImageUrl", "")}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                    >
                      إزالة الصورة
                    </button>
                  ) : null}
                  <span className="text-sm text-slate-500">من جهازك مباشرة بدل إدخال رابط يدوي.</span>
                </div>

                {coverUpload.message ? (
                  <div className={coverUpload.error ? "px-4 py-3 text-sm text-rose-700" : "px-4 py-3 text-sm text-emerald-700"}>
                    {coverUpload.message}
                  </div>
                ) : null}

                <div className="px-4 pb-4">
                  {form.coverImageUrl ? (
                    <div className="relative mt-4 h-52 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                      <BlogImage
                        src={form.coverImageUrl}
                        alt={form.title || "Cover preview"}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                      لم يتم اختيار صورة غلاف بعد.
                    </div>
                  )}
                </div>
              </div>
            </label>

            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">التصنيف الرئيسي</span>
                <select
                  value={form.categoryParent}
                  onChange={(event) => handleParentCategoryChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-orange-300 focus:bg-white"
                >
                  <option value="">اختر التصنيف الرئيسي</option>
                  {parentCategoryOptions.map((parentName) => (
                    <option key={parentName} value={parentName}>
                      {parentName}
                    </option>
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
                  placeholder="مثل: العلوم، القانون، الأطفال"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">التصنيف الفرعي</span>
                <select
                  value={childCategoryOptions.includes(form.category) ? form.category : ""}
                  onChange={(event) => handleChildCategoryChange(event.target.value)}
                  disabled={!(form.newCategoryParent || form.categoryParent) || childCategoryOptions.length === 0}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-orange-300 focus:bg-white"
                >
                  <option value="">{childCategoryOptions.length ? "اختر التصنيف الفرعي" : "لا توجد تصنيفات فرعية لهذا القسم"}</option>
                  {childCategoryOptions.map((child) => (
                    <option key={child} value={child}>
                      {child}
                    </option>
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 focus:border-orange-300 focus:bg-white"
                  placeholder="مثل: الفضاء، التحفيز، التغذية العلاجية"
                />
              </label>
            </div>
          </div>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold text-slate-900">الوسوم</span>
            <input
              value={form.tagsInput}
              onChange={(event) => updateField("tagsInput", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
              placeholder="تحليلات، Dribdo، مجتمع، تحديثات"
            />
          </label>

          {requiresToken ? (
            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">رمز الإدارة</span>
              <input
                type="password"
                value={form.adminToken}
                onChange={(event) => updateField("adminToken", event.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
                placeholder="BLOG_ADMIN_TOKEN"
              />
            </label>
          ) : null}

          <div className="mt-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">المحتوى الغني</div>
                <div className="mt-1 text-sm text-slate-500">عناوين، ألوان، جداول، وسائط، أزرار، embeds ومحاذاة كاملة.</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                Rich Text / HTML
              </div>
            </div>
            <RichTextEditorField value={form.content} onChange={(html) => updateField("content", html)} />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <SubmitButton pending={isSaving} editing={editing} />
            <p className="text-sm text-slate-500">
              سيتم حفظ المقال بحالة
              {" "}
              <span className="font-semibold text-slate-900">published</span>
              {" "}
              مع
              {" "}
              <code>published_at</code>
              {" "}
              وتحديث
              {" "}
              <code>updated_at</code>
              {" "}
              تلقائيًا من trigger الحالي.
            </p>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.5)]">
            <div className="text-sm font-semibold text-slate-500">معاينة سريعة</div>
            <h2 className="mt-4 text-2xl font-black text-slate-950">
              {form.title || "عنوان المقال سيظهر هنا"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {form.excerpt || "أضف ملخصًا مقنعًا يشرح قيمة المقال خلال سطرين إلى ثلاثة أسطر."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(tagsPreview.length ? tagsPreview : ["featured", "analysis"]).map((tag) => (
                <span key={tag} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="mt-6 rounded-3xl bg-slate-950 px-5 py-4 text-sm text-slate-300" dir="ltr">
              /blog/{visibleSlug || "your-story-slug"}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-500">SEO Score</div>
                <div className="mt-1 text-2xl font-black text-slate-950">{seoChecklist.score}%</div>
              </div>
              <div
                className={[
                  "flex h-14 w-14 items-center justify-center rounded-full text-xs font-black text-white",
                  seoChecklist.score >= 80 ? "bg-emerald-600" : seoChecklist.score >= 50 ? "bg-amber-600" : "bg-red-700",
                ].join(" ")}
              >
                SEO
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {seoChecklist.checks.map((item) => (
                <div key={item.label} className="flex items-start gap-3 text-right">
                  <span className={item.passed ? "mt-1 font-black text-emerald-600" : "mt-1 font-black text-slate-400"}>
                    {item.passed ? "✓" : "○"}
                  </span>
                  <span className={item.passed ? "text-sm font-semibold text-slate-800" : "text-sm text-slate-500"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.5)]">
            <div className="text-sm font-semibold text-slate-500">مراجعة المحتوى</div>
            <div className="mt-4 space-y-3">
              {contentReview.map((item) => (
                <div key={item.label} className="flex items-start gap-3 text-right">
                  <span className={item.passed ? "mt-1 font-black text-emerald-600" : "mt-1 font-black text-red-500"}>
                    {item.passed ? "✓" : "!"}
                  </span>
                  <span className={item.passed ? "text-sm font-semibold text-slate-800" : "text-sm font-semibold text-red-700"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-500">روابط داخلية مقترحة</div>
                <div className="mt-1 text-xs text-slate-500">أضفها داخل المقال لتقوية SEO والتنقل.</div>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">{internalLinkSuggestions.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {internalLinkSuggestions.length ? (
                internalLinkSuggestions.map((post) => (
                  <div key={post.id || post.slug} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-right">
                    <div className="line-clamp-2 text-sm font-black leading-6 text-slate-950">{post.title}</div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <Link href={`/blog/${post.slug}`} className="font-bold text-red-700 hover:underline">
                        فتح
                      </Link>
                      <code className="rounded-full bg-white px-2 py-1 text-slate-500" dir="ltr">/blog/{post.slug}</code>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-500">
                  اكتب عنواناً وملخصاً أو اختر تصنيفاً لتظهر اقتراحات مرتبطة تلقائياً.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.5)]">
            <div className="text-sm font-semibold text-slate-500">جودة التحرير</div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold text-slate-500">عدد كلمات العنوان</div>
                <div className="mt-1 text-xl font-bold text-slate-950">{titleWords}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold text-slate-500">طول الملخص</div>
                <div className="mt-1 text-xl font-bold text-slate-950">{form.excerpt.trim().length}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                يمكن تحرير المقالات القديمة أيضًا. إذا كان المحتوى مخزّنًا بـ Markdown فسيتم تحويله تلقائيًا إلى HTML داخل المحرر قبل التعديل.
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.35)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-500">إدارة المقالات</div>
            <h2 className="mt-1 text-2xl font-black text-slate-950">قائمة المقالات الحالية</h2>
          </div>
          <div className="flex w-full flex-wrap gap-3 lg:w-auto">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-64 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
              placeholder="ابحث بالعنوان أو slug أو الوسوم"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-orange-300 focus:bg-white"
            >
              <option value="all">كل التصنيفات</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-600">
              {selectedPostIds.length ? `تم تحديد ${selectedPostIds.length} مقال` : "لم يتم تحديد أي مقال بعد"}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleAllFiltered}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 sm:text-sm"
              >
                {allFilteredSelected ? "إلغاء تحديد المفلتر" : "تحديد كل المقالات المفلترة"}
              </button>
              <button
                type="button"
                onClick={() => selectIds(allVisibleIds)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 sm:text-sm"
              >
                تحديد المقالات الظاهرة
              </button>
              {categoryFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => selectIds(currentCategoryIds)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 sm:text-sm"
                >
                  تحديد كل مقالات التصنيف
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedPostIds([])}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:text-sm"
              >
                إلغاء التحديد
              </button>
              <button
                type="button"
                onClick={() => openBulkDeleteModal(selectedPostIds, categoryFilter !== "all" ? categoryFilter : "")}
                disabled={!selectedPostIds.length || isDeleting}
                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
              >
                حذف المحدد
              </button>
              <button
                type="button"
                onClick={() => openBulkDeleteModal(currentCategoryIds, categoryFilter !== "all" ? categoryFilter : "")}
                disabled={categoryFilter === "all" || !currentCategoryIds.length || isDeleting}
                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
              >
                حذف كل مقالات التصنيف
              </button>
              <button
                type="button"
                onClick={() => openBulkDeleteModal(allFilteredIds)}
                disabled={!allFilteredIds.length || isDeleting}
                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
              >
                حذف كل المقالات المفلترة
              </button>
            </div>
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="mt-8 rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
            لا توجد مقالات مطابقة للفلاتر الحالية.
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {visiblePosts.map((post) => (
              <article key={post.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectedPostIds.includes(post.id)}
                          onChange={() => togglePostSelection(post.id)}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        تحديد
                      </label>
                      <StatusBadge status={post.status} />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{post.category || "General"}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-black text-slate-950">{post.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(post.tags || []).map((tag) => (
                        <span key={`${post.id}-${tag}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 text-xs text-slate-400" dir="ltr">
                      /blog/{post.slug}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                    >
                      عرض
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleEdit(post)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      disabled={isDeleting}
                      className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {hasMorePosts ? (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllPosts((current) => !current)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                >
                  {showAllPosts ? "إخفاء المقالات الإضافية" : `عرض المزيد (${filteredPosts.length - INITIAL_VISIBLE_POSTS})`}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
