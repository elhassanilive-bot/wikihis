import Link from "next/link";
import { notFound } from "next/navigation";
import PostGridCard from "@/components/blog/PostGridCard";
import { site } from "@/config/site";
import { listPostCategories, listPostsDetailed } from "@/lib/blog/posts";
import { resolveCategoryFromSlug } from "@/lib/blog/categoryRoutes";

const POSTS_PER_PAGE = 15;

function normalizePage(value) {
  const page = Number.parseInt(String(value || "1"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildPageHref(slug, page) {
  return page > 1 ? `/category/${encodeURIComponent(slug)}?page=${page}` : `/category/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { categories } = await listPostCategories();
  const category = resolveCategoryFromSlug(categories, resolvedParams.slug);

  if (!category) {
    return {
      title: "تصنيف غير موجود",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${category} | ${site.name}`,
    description: `أحدث مقالات ${category} في ${site.name}، مع محتوى عربي متجدد ومقالات من مساهمين في مجالات متعددة.`,
    alternates: { canonical: `/category/${resolvedParams.slug}` },
    openGraph: {
      title: `${category} | ${site.name}`,
      description: `أحدث مقالات ${category} في ${site.name}.`,
      url: `/category/${resolvedParams.slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { categories } = await listPostCategories();
  const category = resolveCategoryFromSlug(categories, resolvedParams.slug);

  if (!category) notFound();

  const currentPage = normalizePage(resolvedSearchParams?.page);
  const { posts, totalPages, totalCount, error } = await listPostsDetailed({
    limit: POSTS_PER_PAGE,
    page: currentPage,
    category,
  });

  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="text-sm font-semibold text-slate-500">
          <Link href="/" className="hover:text-red-700">الرئيسية</Link>
          <span className="mx-2">/</span>
          <span>{category}</span>
        </nav>

        <div className="mt-7 border-b border-slate-200 pb-6 text-right">
          <div className="text-xs font-black tracking-[0.2em] text-red-700">تصنيف</div>
          <h1 className="mt-3 text-4xl font-black text-slate-950">{category}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            اقرأ أحدث المقالات المنشورة ضمن تصنيف {category} في {site.name}.
          </p>
          <div className="mt-4 text-sm font-bold text-slate-500">{totalCount || 0} مقال</div>
        </div>

        {error ? (
          <div className="mt-8 border border-red-200 bg-red-50 p-5 text-right text-sm text-red-900">{error}</div>
        ) : null}

        {posts.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <PostGridCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="mt-8 border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
            لا توجد مقالات منشورة في هذا التصنيف حالياً.
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-3">
            {currentPage > 1 ? (
              <Link className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" href={buildPageHref(resolvedParams.slug, currentPage - 1)}>
                السابق
              </Link>
            ) : null}
            <span className="text-sm font-bold text-slate-500">
              صفحة {currentPage} من {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" href={buildPageHref(resolvedParams.slug, currentPage + 1)}>
                التالي
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
