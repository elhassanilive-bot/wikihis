import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import { site } from "@/config/site";
import { estimateReadingTime, formatArabicDate } from "@/lib/blog/render";
import { getContributorPublicProfile } from "@/lib/blog/posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function ContributorAvatar({ contributor }) {
  if (contributor.avatarUrl) {
    return (
      <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/30 bg-white/10 shadow-lg">
        <BlogImage src={contributor.avatarUrl} alt={contributor.displayName} fill sizes="112px" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white/10 text-4xl font-black text-white">
      {String(contributor.displayName || "م").trim().charAt(0)}
    </div>
  );
}

function ContributorPostCard({ post }) {
  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_20px_55px_-45px_rgba(15,23,42,0.35)]">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative h-56 bg-slate-200">
          <BlogImage src={post.coverImageUrl} alt={post.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="h-full w-full object-cover" />
          <div className="absolute left-3 top-3 rounded-full bg-red-700 px-3 py-1 text-[11px] font-bold text-white">{post.category || "مقال"}</div>
        </div>
        <div className="p-5 text-right">
          <h2 className="line-clamp-2 text-xl font-black leading-8 text-slate-950">{post.title}</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-400">
            <span>{formatArabicDate(post.publishedAt || post.createdAt)}</span>
            <span>{estimateReadingTime(post.content)} دقائق</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { contributor } = await getContributorPublicProfile(resolvedParams.id);

  if (!contributor) {
    return {
      title: "مساهم غير موجود",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: contributor.displayName,
    description: `صفحة ${contributor.displayName} مع المقالات المنشورة في ويكيهيس.`,
    alternates: { canonical: `/contributors/${contributor.id}` },
    openGraph: {
      title: contributor.displayName,
      description: `مقالات ${contributor.displayName} المنشورة في ${site.name}.`,
      url: `/contributors/${contributor.id}`,
      images: contributor.avatarUrl ? [{ url: contributor.avatarUrl }] : undefined,
    },
  };
}

export default async function ContributorProfilePage({ params }) {
  const resolvedParams = await params;
  const { contributor, posts, error } = await getContributorPublicProfile(resolvedParams.id, { limit: 30 });

  if (!contributor) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)]">
          <h1 className="text-3xl font-black text-slate-950">المساهم غير موجود</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            لم نعثر على هذا المساهم أو لا توجد له مقالات منشورة بعد.
            {error ? ` السبب: ${error}` : ""}
          </p>
          <div className="mt-6">
            <Link href="/contributors" className="rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800">
              العودة إلى المساهمين
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${site.url}/contributors/${contributor.id}#person`,
    name: contributor.displayName,
    image: contributor.avatarUrl || undefined,
    url: `${site.url}/contributors/${contributor.id}`,
    worksFor: {
      "@type": "Organization",
      name: site.name,
      alternateName: site.nameEn,
      url: site.url,
    },
    mainEntityOfPage: `${site.url}/contributors/${contributor.id}`,
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_26%,#f5f5f1_100%)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <section className="bg-[linear-gradient(155deg,#111827_0%,#1f2937_48%,#7f1d1d_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-end gap-6 text-right text-white">
            <ContributorAvatar contributor={contributor} />
            <div>
              <div className="text-xs font-extrabold tracking-[0.22em] text-red-300">WIKIHIS WRITER</div>
              <h1 className="mt-3 text-4xl font-black">{contributor.displayName}</h1>
              <div className="mt-4 flex flex-wrap justify-end gap-3 text-sm text-white/80">
                <span>{contributor.postsCount} مقال منشور</span>
                <span>آخر نشر: {formatArabicDate(contributor.lastPublishedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-500">أرشيف المساهم</div>
            <h2 className="mt-1 text-3xl font-black text-slate-950">المقالات المنشورة</h2>
          </div>
          <Link href="/contributors" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700">
            كل المساهمين
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <ContributorPostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
