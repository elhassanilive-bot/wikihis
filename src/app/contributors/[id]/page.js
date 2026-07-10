import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import { site } from "@/config/site";
import { estimateReadingTime, formatArabicDate } from "@/lib/blog/render";
import { getContributorPublicProfile } from "@/lib/blog/posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function formatNumber(value) {
  try {
    return new Intl.NumberFormat("ar-MA").format(Number(value) || 0);
  } catch {
    return String(Number(value) || 0);
  }
}

function ContributorAvatar({ contributor, large = false }) {
  const sizeClass = large ? "h-36 w-36 sm:h-44 sm:w-44" : "h-28 w-28";

  if (contributor.avatarUrl) {
    return (
      <div className={`relative overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.8)] ${sizeClass}`}>
        <BlogImage
          src={contributor.avatarUrl}
          alt={contributor.displayName}
          fill
          sizes={large ? "176px" : "112px"}
          className="h-full w-full object-cover"
          priority={large}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-full border-4 border-white bg-red-700 text-5xl font-black text-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.8)] ${sizeClass}`}>
      {String(contributor.displayName || "م").trim().charAt(0)}
    </div>
  );
}

function StatBox({ label, value, helper }) {
  return (
    <div className="border border-slate-200 bg-white px-5 py-4 text-center shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
      <div className="text-3xl font-black text-slate-950">{formatNumber(value)}</div>
      <div className="mt-1 text-sm font-bold text-slate-600">{label}</div>
      {helper ? <div className="mt-1 text-xs font-semibold text-slate-400">{helper}</div> : null}
    </div>
  );
}

function ContributorPostCard({ post }) {
  return (
    <article className="overflow-hidden border border-slate-200 bg-white shadow-[0_20px_55px_-45px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_-40px_rgba(15,23,42,0.35)]">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative h-56 bg-slate-200">
          <BlogImage src={post.coverImageUrl} alt={post.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="h-full w-full object-cover" />
          <div className="absolute left-3 top-3 bg-red-700 px-3 py-1 text-[11px] font-bold text-white">{post.category || "مقال"}</div>
        </div>
        <div className="p-5 text-right">
          <h2 className="line-clamp-2 text-xl font-black leading-8 text-slate-950">{post.title}</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-400">
            <span>{formatArabicDate(post.publishedAt || post.createdAt)}</span>
            <span>{estimateReadingTime(post.content)} دقائق قراءة</span>
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
    title: `${contributor.displayName} | مساهم في Wikihat`,
    description: `الملف الشخصي للمساهم ${contributor.displayName} في Wikihat، مع عدد المنشورات والتفاعلات وأحدث المقالات المنشورة.`,
    alternates: { canonical: `/contributors/${contributor.id}` },
    openGraph: {
      title: `${contributor.displayName} | Wikihat`,
      description: `منشورات ${contributor.displayName} وتفاعلاته على Wikihat.`,
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
        <div className="border border-slate-200 bg-white p-8 text-right shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)]">
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
      name: site.officialName,
      alternateName: site.brandKeywords,
      url: site.url,
    },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: contributor.interactionsCount || 0,
    },
    mainEntityOfPage: `${site.url}/contributors/${contributor.id}`,
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_34%,#f5f5f1_100%)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <section className="border-b border-slate-200 bg-[linear-gradient(160deg,#111827_0%,#1f2937_52%,#7f1d1d_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <ContributorAvatar contributor={contributor} large />
            <div className="mt-6 text-xs font-extrabold tracking-[0.28em] text-red-200">WIKIHAT CONTRIBUTOR</div>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">{contributor.displayName}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
              ملف مساهم يعرض المنشورات المنشورة والتفاعلات التي حصدتها مقالاته داخل Wikihat.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-white/80">
              <span>آخر نشر: {formatArabicDate(contributor.lastPublishedAt) || "غير متاح"}</span>
              <span className="hidden text-white/35 sm:inline">•</span>
              <span>معرّف المساهم: {contributor.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatBox label="المنشورات" value={contributor.postsCount} helper="مقالات منشورة" />
          <StatBox label="التفاعلات" value={contributor.interactionsCount} helper="مشاهدات + إعجابات + تعليقات" />
          <StatBox label="المشاهدات" value={contributor.totalViews} helper="إجمالي مشاهدات المقالات" />
          <StatBox label="الردود والإعجابات" value={(contributor.reactionsCount || 0) + (contributor.commentsCount || 0)} helper="تفاعل مباشر" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 text-right sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">منشورات المساهم</div>
            <h2 className="mt-1 text-3xl font-black text-slate-950">أحدث المقالات المنشورة</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              تظهر هنا المقالات المنشورة باسم {contributor.displayName} مرتبة من الأحدث إلى الأقدم.
            </p>
          </div>
          <Link href="/contributors" className="w-fit rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700">
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
