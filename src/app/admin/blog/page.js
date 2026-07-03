import { revalidatePath } from "next/cache";
import AdminBlogDashboard from "@/components/blog/AdminBlogDashboard";
import MemberArticlesModerationPanel from "@/components/blog/MemberArticlesModerationPanel";
import { createPost, deletePost, deletePosts, isBlogPublishingEnabled, listPostsForAdmin, updatePost } from "@/lib/blog/posts";
import { BLOG_CATEGORY_TREE } from "@/lib/blog/categories";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const metadata = {
  title: "لوحة المدونة",
  description: "نشر وإدارة مقالات Wikihat.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/admin/blog" },
};

function SetupBox() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.5)] sm:p-8">
      <h2 className="text-2xl font-black text-slate-950">إعداد Supabase للنشر</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        بنية الجداول الحالية كافية لهذا التطوير لأن
        {" "}
        <code>content</code>
        {" "}
        يبقى حقلًا نصيًا، لكننا نخزّن فيه الآن
        {" "}
        <strong>HTML غني</strong>
        {" "}
        بدل Markdown. شغّل
        {" "}
        <code>supabase/blog_schema.sql</code>
        {" "}
        ثم
        {" "}
        <code>supabase/blog_storage.sql</code>
        {" "}
        لتفعيل رفع الوسائط، ثم
        {" "}
        <code>supabase/blog_temp_publishing.sql</code>
        {" "}
        مؤقتًا إذا أردت تجربة النشر بدون تسجيل.
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        إذا كنت تستعمل اسم bucket مختلفًا، أضف
        {" "}
        <code>NEXT_PUBLIC_SUPABASE_BLOG_BUCKET</code>
        {" "}
        داخل
        {" "}
        <code>.env.local</code>.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-5">
          <div className="text-sm font-semibold text-slate-900">البيئة</div>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            تأكد من وجود
            {" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code>
            {" "}
            و
            {" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            {" "}
            ويفضّل أيضًا
            {" "}
            <code>NEXT_PUBLIC_SUPABASE_BLOG_BUCKET</code>
            {" "}
            داخل
            {" "}
            <code>.env.local</code>.
          </p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <div className="text-sm font-semibold text-slate-900">RLS</div>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            القراءة العامة تبقى محصورة على
            {" "}
            <code>{"status = 'published'"}</code>
            {" "}
            بينما عمليات التعديل والحذف تحتاج Service Role أو سياسات RLS إضافية.
          </p>
        </div>
      </div>
    </div>
  );
}

function validateAdminToken(adminToken) {
  const expectedToken = process.env.BLOG_ADMIN_TOKEN || "";
  const providedToken = String(adminToken || "");

  if (expectedToken && providedToken !== expectedToken) {
    return "رمز الإدارة غير صحيح. راجع قيمة BLOG_ADMIN_TOKEN ثم أعد المحاولة.";
  }

  return null;
}

export default async function AdminBlogPage() {
  async function savePostAction(formData) {
    "use server";

    const tokenError = validateAdminToken(formData.get("adminToken"));
    if (tokenError) {
      return { ok: false, error: tokenError };
    }

    const payload = {
      id: formData.get("id"),
      title: formData.get("title"),
      slug: formData.get("slug"),
      excerpt: formData.get("excerpt"),
      coverImageUrl: formData.get("coverImageUrl"),
      category: formData.get("category"),
      categoryParent: formData.get("categoryParent"),
      categorySlug: formData.get("categorySlug"),
      tags: String(formData.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      content: formData.get("content"),
    };

    const result = payload.id ? await updatePost(payload) : await createPost(payload);

    if (result.ok) {
      revalidatePath("/");
      revalidatePath("/blog");
      revalidatePath("/admin/blog");
      revalidatePath(`/blog/${result.slug}`);
    }

    return result;
  }

  async function deletePostAction(payload) {
    "use server";

    const tokenError = validateAdminToken(payload?.adminToken);
    if (tokenError) {
      return { ok: false, error: tokenError };
    }

    const result = await deletePost(payload?.id);

    if (result.ok) {
      revalidatePath("/");
      revalidatePath("/blog");
      revalidatePath("/admin/blog");
    }

    return result;
  }

  async function bulkDeletePostsAction(payload) {
    "use server";

    const tokenError = validateAdminToken(payload?.adminToken);
    if (tokenError) {
      return { ok: false, error: tokenError };
    }

    const result = await deletePosts(payload?.ids || []);

    if (result.ok) {
      revalidatePath("/");
      revalidatePath("/blog");
      revalidatePath("/admin/blog");
    }

    return result;
  }

  const publishingEnabled = isBlogPublishingEnabled();
  const requiresToken = Boolean(process.env.BLOG_ADMIN_TOKEN);
  const supabaseReady = isSupabaseConfigured();
  const { posts, error: adminListError } = supabaseReady ? await listPostsForAdmin({ limit: 100 }) : { posts: [], error: null };

  return (
    <div className="w-full bg-[linear-gradient(180deg,#fff7ed_0%,#fff 28%,#f8fafc_100%)]">
      <section className="py-8 sm:py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
          {!supabaseReady ? <SetupBox /> : null}
          <AdminBlogDashboard
            posts={posts}
            categoryTree={BLOG_CATEGORY_TREE}
            saveAction={savePostAction}
            deleteAction={deletePostAction}
            bulkDeleteAction={bulkDeletePostsAction}
            publishingEnabled={publishingEnabled}
            requiresToken={requiresToken}
            adminListError={adminListError}
          />
          <MemberArticlesModerationPanel />
        </div>
      </section>
    </div>
  );
}
