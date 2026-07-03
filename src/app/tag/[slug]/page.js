import Link from "next/link";
import PostGridCard from "@/components/blog/PostGridCard";
import { site } from "@/config/site";
import { createSlugCandidate } from "@/lib/blog/slug";
import { listPostsByTag } from "@/lib/blog/posts";
import { buildBreadcrumbJsonLd, buildJsonLdGraph, buildMetadata } from "@/lib/seo";

const POSTS_PER_PAGE = 15;

function decodeTag(slug) {
  return decodeURIComponent(String(slug || "")).replace(/-+/g, " ").trim();
}

function normalizePage(value) {
  const page = Number.parseInt(String(value || "1"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildPageHref(slug, page) {
  return page > 1 ? `/tag/${encodeURIComponent(slug)}?page=${page}` : `/tag/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const tag = decodeTag(resolvedParams.slug);

  if (!tag) {
    return buildMetadata({
      title: "وسم غير موجود",
      path: `/tag/${resolvedParams.slug || ""}`,
      robots: { index: false, follow: false },
    });
  }

  return buildMetadata({
    title: `وسم ${tag}`,
    description: `أحدث مقالات Wikihat المرتبطة بوسم ${tag}، مع محتوى عربي متجدد وروابط لموضوعات مشابهة.`,
    path: `/tag/${createSlugCandidate(tag)}`,
    keywords: [tag, `مقالات ${tag}`, `وسم ${tag}`],
    section: tag,
  });
}

export default async function TagPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const tag = decodeTag(resolvedParams.slug);
  const currentPage = normalizePage(resolvedSearchParams?.page);
  const { posts, totalPages, totalCount, error } = await listPostsByTag({
    tag,
    limit: POSTS_PER_PAGE,
    page: currentPage,
  });

  const jsonLd = buildJsonLdGraph([
    buildBreadcrumbJsonLd([
      { name: "الرئيسية", url: "/" },
      { name: "الوسوم", url: "/search" },
      { name: tag || "وسم", url: `/tag/${resolvedParams.slug}` },
    ]),
    {
      "@type": "CollectionPage",
      "@id": `${site.url}/tag/${resolvedParams.slug}#collection`,
      name: `وسم ${tag}`,
      description: `مقالات Wikihat المرتبطة بوسم ${tag}.`,
      url: `${site.url}/tag/${resolvedParams.slug}`,
      inLanguage: site.language,
      isPartOf: { "@id": `${site.url}/#website` },
    },
  ]);

  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-7xl">
        <nav className="text-sm font-semibold text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-red-700">الرئيسية</Link>
          <span className="mx-2">/</span>
          <span>وسم {tag}</span>
        </nav>

        <div className="mt-7 border-b border-slate-200 pb-6 text-right">
          <div className="text-xs font-black tracking-[0.2em] text-red-700">WIKIHAT TAG</div>
          <h1 className="mt-3 text-4xl font-black text-slate-950">وسم {tag}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            اقرأ أحدث المقالات المنشورة في Wikihat والمرتبطة بهذا الوسم.
          </p>
          <div className="mt-4 text-sm font-bold text-slate-500">{totalCount || 0} مقال</div>
        </div>

        {error ? <div className="mt-8 border border-red-200 bg-red-50 p-5 text-right text-sm text-red-900">{error}</div> : null}

        {posts.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <PostGridCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="mt-8 border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
            لا توجد مقالات منشورة تحت هذا الوسم حاليًا.
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
