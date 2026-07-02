import PostGridCard from "@/components/blog/PostGridCard";
import SearchBoxWithSuggestions from "@/components/blog/SearchBoxWithSuggestions";
import { site } from "@/config/site";
import { listPostsDetailed } from "@/lib/blog/posts";

const POSTS_PER_PAGE = 12;

export const metadata = {
  title: `البحث | ${site.name}`,
  description: `ابحث في مقالات ${site.name} حسب العنوان أو المحتوى أو التصنيف.`,
  alternates: { canonical: "/search" },
};

function normalizePage(value) {
  const page = Number.parseInt(String(value || "1"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildSearchHref({ query, page }) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

export default async function SearchPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const query = String(resolvedSearchParams?.q || "").trim();
  const currentPage = normalizePage(resolvedSearchParams?.page);
  const result = query
    ? await listPostsDetailed({ limit: POSTS_PER_PAGE, page: currentPage, search: query })
    : { posts: [], totalPages: 0, totalCount: 0, error: null };

  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-black tracking-[0.2em] text-red-700">بحث ويكيهات</div>
          <h1 className="mt-3 text-4xl font-black text-slate-950">ابحث في المقالات</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            اكتب كلمة أو عبارة وستظهر اقتراحات تلقائية من المقالات المنشورة.
          </p>
          <SearchBoxWithSuggestions initialQuery={query} />
        </div>

        {query ? (
          <div className="mt-10 border-b border-slate-200 pb-4 text-right">
            <h2 className="text-2xl font-black text-slate-950">نتائج البحث عن: {query}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">{result.totalCount || 0} نتيجة</p>
          </div>
        ) : null}

        {result.error ? (
          <div className="mt-8 border border-red-200 bg-red-50 p-5 text-right text-sm text-red-900">{result.error}</div>
        ) : null}

        {query && result.posts.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {result.posts.map((post) => (
              <PostGridCard key={post.slug} post={post} />
            ))}
          </div>
        ) : null}

        {query && !result.posts.length && !result.error ? (
          <div className="mt-8 border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
            لا توجد نتائج مطابقة. جرّب كلمة أخرى أو تصنيفاً مختلفاً.
          </div>
        ) : null}

        {result.totalPages > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-3">
            {currentPage > 1 ? (
              <a className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" href={buildSearchHref({ query, page: currentPage - 1 })}>
                السابق
              </a>
            ) : null}
            <span className="text-sm font-bold text-slate-500">
              صفحة {currentPage} من {result.totalPages}
            </span>
            {currentPage < result.totalPages ? (
              <a className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" href={buildSearchHref({ query, page: currentPage + 1 })}>
                التالي
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
