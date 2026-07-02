import Link from "next/link";
import { getPostBySlugDetailed, listPopularPosts, listPostCategories, listPostsDetailed } from "@/lib/blog/posts";
import { estimateReadingTime, formatArabicDate } from "@/lib/blog/render";
import { renderStoredBlogContent } from "@/lib/blog/content";
import BlogImage from "@/components/blog/BlogImage";
import ArticleComments from "@/components/blog/ArticleComments";
import ArticleEngagementBar from "@/components/blog/ArticleEngagementBar";
import NewsletterSignup from "@/components/blog/NewsletterSignup";
import { site } from "@/config/site";

export const revalidate = 60;

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function buildArticleToc(html) {
  const headings = [];
  let headingIndex = 0;

  const htmlWithAnchors = String(html || "").replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, inner) => {
    const text = stripHtml(inner);
    if (!text) return match;

    headingIndex += 1;
    const id = `article-section-${headingIndex}`;
    headings.push({
      id,
      text,
      level: String(tag).toLowerCase(),
    });

    if (/id\s*=/.test(attrs)) {
      return `<${tag}${attrs}>${inner}</${tag}>`;
    }

    return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
  });

  return { htmlWithAnchors, headings };
}

function buildTocTree(headings) {
  const tree = [];
  let currentGroup = null;

  headings.forEach((item) => {
    if (item.level === "h2" || !currentGroup) {
      currentGroup = {
        ...item,
        children: [],
      };
      tree.push(currentGroup);
      return;
    }

    currentGroup.children.push(item);
  });

  return tree;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { post } = await getPostBySlugDetailed(resolvedParams.slug);

  if (!post) {
    return {
      title: "مقال غير موجود",
      robots: { index: false, follow: false },
    };
  }

  const ogImage = `${site.url}/api/og?title=${encodeURIComponent(post.title)}&category=${encodeURIComponent(post.category || "مقال")}`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt || post.publishedAt || post.createdAt,
      authors: post.authorDisplayName ? [post.authorDisplayName] : [site.name],
      section: post.category || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  };
}

function buildPostJsonLd({ post, plainText, readingTime }) {
  const postUrl = `${site.url}/blog/${post.slug}`;
  const image = post.coverImageUrl || `${site.url}/icon.png`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${postUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "الرئيسية",
            item: site.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: post.category || "المقالات",
            item: `${site.url}/?category=${encodeURIComponent(post.category || "المقالات")}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: postUrl,
          },
        ],
      },
      {
        "@type": "Article",
        "@id": `${postUrl}#article`,
        mainEntityOfPage: postUrl,
        headline: post.title,
        description: post.excerpt,
        image,
        inLanguage: "ar",
        articleSection: post.category || undefined,
        keywords: Array.isArray(post.tags) ? post.tags.join(", ") : undefined,
        wordCount: plainText ? plainText.split(/\s+/).filter(Boolean).length : undefined,
        timeRequired: `PT${Math.max(1, Number(readingTime) || 1)}M`,
        datePublished: post.publishedAt || post.createdAt,
        dateModified: post.updatedAt || post.publishedAt || post.createdAt,
        author: {
          "@type": "Person",
          name: post.authorDisplayName || site.name,
        },
        publisher: {
          "@type": "Organization",
          name: site.name,
          alternateName: site.nameEn,
          logo: {
            "@type": "ImageObject",
            url: `${site.url}/icon.png`,
          },
        },
      },
    ],
  };
}

function NotFoundState({ error }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="border border-slate-200 bg-white px-6 py-12 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h1 className="text-3xl font-black text-slate-950">المقال غير موجود</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          قد يكون تم حذف المقال أو لم يُنشر بعد، أو أن الرابط المختصر غير صحيح.
        </p>
        {error ? (
          <div className="mt-6 border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
            سبب Supabase: <span className="font-mono">{error}</span>
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/" className="bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800">
            العودة إلى الرئيسية
          </Link>
          <Link href="/admin/blog" className="border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700">
            فتح لوحة النشر
          </Link>
        </div>
      </div>
    </div>
  );
}

function LiveArticleCover({ post }) {
  if (String(post.coverImageUrl || "").trim()) {
    return (
      <BlogImage
        src={post.coverImageUrl}
        alt={post.title}
        fill
        priority
        sizes="100vw"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex h-full w-full flex-col justify-between bg-[linear-gradient(135deg,#7f1d1d_0%,#991b1b_35%,#111827_100%)] p-8 text-white">
      <div className="flex items-center justify-between text-xs font-bold text-white/75">
        <span className="rounded-full bg-white/10 px-3 py-1">{post.category || "مقال"}</span>
        <span>{formatArabicDate(post.publishedAt || post.createdAt)}</span>
      </div>
      <div className="max-w-3xl space-y-4 text-right">
        <h2 className="text-3xl font-black leading-[1.6] sm:text-4xl">{post.title}</h2>
        <p className="line-clamp-4 text-sm leading-8 text-white/82 sm:text-base">{post.excerpt}</p>
      </div>
      <div className="flex justify-start">
        <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white">
          تغطية تحريرية
        </span>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

function RelatedCard({ post }) {
  return (
    <article className="border border-slate-200 bg-white">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative h-44 overflow-hidden bg-slate-200">
          <BlogImage
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="h-full w-full object-cover"
          />
          <div className="absolute left-3 top-3 bg-red-700 px-2 py-1 text-[10px] font-bold text-white">
            {post.category || "مقال"}
          </div>
        </div>
        <div className="p-4 text-right">
          <h3 className="line-clamp-2 text-lg font-black leading-8 text-slate-950">{post.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
          <div className="mt-4 text-xs font-bold text-slate-500">{formatArabicDate(post.publishedAt || post.createdAt)}</div>
        </div>
      </Link>
    </article>
  );
}

function CompactSuggestedCard({ post }) {
  return (
    <article className="border border-slate-200 bg-white">
      <Link href={`/blog/${post.slug}`} className="grid grid-cols-[82px_1fr] gap-3 p-3">
        <div className="relative h-20 overflow-hidden bg-slate-200">
          <BlogImage
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="82px"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 text-right">
          <h3 className="line-clamp-2 text-sm font-black leading-6 text-slate-950">{post.title}</h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{post.excerpt}</p>
        </div>
      </Link>
    </article>
  );
}

function EditorialTrustBox({ post }) {
  const sensitiveCategory = /صحة|طب|مال|استثمار|اقتصاد|قانون/i.test(`${post.category || ""} ${post.categoryParent || ""}`);

  return (
    <div className="border border-red-100 bg-white p-6 text-right shadow-[0_20px_55px_-45px_rgba(127,29,29,0.35)]">
      <div className="text-xs font-extrabold tracking-[0.18em] text-red-700">ثقة ويكيهات</div>
      <h2 className="mt-2 text-xl font-black text-slate-950">شفافية تحريرية</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
        <p>نراجع المقالات قبل نشرها، ونوضح تاريخ النشر والتحديث ومصدر الكاتب عندما يكون متاحاً.</p>
        {sensitiveCategory ? (
          <p className="border-r-4 border-red-600 bg-red-50 px-3 py-2 text-red-900">
            هذا التصنيف يحتاج قراءة واعية؛ المحتوى معلوماتي ولا يغني عن رأي مختص.
          </p>
        ) : null}
      </div>
      <div className="mt-5 grid gap-2 text-sm font-bold">
        <Link href="/editorial-policy" className="border border-slate-200 px-4 py-3 text-slate-700 transition hover:border-red-200 hover:text-red-700">
          سياسة التحرير
        </Link>
        <Link href="/contact" className="border border-slate-200 px-4 py-3 text-slate-700 transition hover:border-red-200 hover:text-red-700">
          مراسلة التحرير
        </Link>
      </div>
    </div>
  );
}

function TocLink({ item }) {
  return (
    <a
      href={`#${item.id}`}
      className={[
        "block py-1.5 text-sm leading-6 text-slate-700 transition hover:text-red-700",
        item.level === "h3" ? "pr-4 text-[13px] text-slate-500" : "font-semibold",
      ].join(" ")}
    >
      {item.text}
    </a>
  );
}

function TocTree({ items }) {
  return (
    <div className="mt-4 space-y-4 text-right">
      {items.map((group) => (
        <div key={group.id}>
          <TocLink item={group} />
          {group.children.length ? (
            <div className="relative mt-1 mr-3 border-r border-slate-400 pr-4">
              {group.children.map((child) => (
                <div key={child.id} className="relative">
                  <span className="absolute right-[-17px] top-4 h-px w-3 bg-slate-400" />
                  <TocLink item={child} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default async function BlogPostPage({ params }) {
  const resolvedParams = await params;
  const { post, error } = await getPostBySlugDetailed(resolvedParams.slug);

  if (!post) {
    return <NotFoundState error={error} />;
  }

  const [{ posts: sameCategoryPosts }, { posts: latestPosts }, { posts: popularPosts }, { categories }] = await Promise.all([
    listPostsDetailed({ limit: 4, category: post.category || null }),
    listPostsDetailed({ limit: 6 }),
    listPopularPosts({ limit: 5, category: post.category || null }),
    listPostCategories(),
  ]);

  const relatedPosts = [...sameCategoryPosts, ...latestPosts]
    .filter((item) => item && item.slug !== post.slug)
    .filter((item, index, array) => array.findIndex((entry) => entry.slug === item.slug) === index)
    .slice(0, 4);
  const compactSuggestions = latestPosts.filter((item) => item && item.slug !== post.slug).slice(0, 3);
  const popularSuggestions = popularPosts.filter((item) => item && item.slug !== post.slug).slice(0, 4);

  const html = renderStoredBlogContent(post.content);
  const { htmlWithAnchors, headings } = buildArticleToc(html);
  const plainText = stripHtml(html);
  const tocTree = buildTocTree(headings);
  const readingTime = estimateReadingTime(post.content);
  const jsonLd = buildPostJsonLd({ post, plainText, readingTime });
  const quickCategories = [post.category, ...categories]
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex((entry) => entry === item) === index)
    .slice(0, 5);

  return (
    <div className="w-full bg-[linear-gradient(180deg,#f5f5f1_0%,#ffffff_24%,#f7f8fa_100%)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <Link href="/" className="font-semibold transition hover:text-red-700">
              الرئيسية
            </Link>
            <span>/</span>
            <Link href={post.category ? `/?category=${encodeURIComponent(post.category)}` : "/"} className="font-semibold transition hover:text-red-700">
              {post.category || "مقال"}
            </Link>
            <span>/</span>
            <span className="line-clamp-1">{post.title}</span>
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="text-right">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                <span className="bg-red-700 px-3 py-1 text-white">{post.category || "مقال"}</span>
                <span>{formatArabicDate(post.publishedAt || post.createdAt)}</span>
                <span>{readingTime} دقائق قراءة</span>
              </div>

              <h1 className="mt-5 max-w-5xl text-3xl font-black leading-[1.5] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.9rem]">
                {post.title}
              </h1>

              <p className="mt-5 max-w-4xl text-lg leading-9 text-slate-600 sm:text-xl">
                {post.excerpt}
              </p>

              {(post.tags || []).length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <ArticleEngagementBar postId={post.id} slug={post.slug} />
            </div>

            <aside className="border border-slate-200 bg-[#fafafa] p-4 text-right">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[11px] font-extrabold tracking-[0.2em] text-red-700">WIKIHAT</div>
                  <div className="mt-1 text-xl font-black text-slate-950">مقترحات سريعة</div>
                </div>
                <span className="h-6 w-1 bg-red-700" />
              </div>
              <div className="mt-4 space-y-3">
                {compactSuggestions.map((suggestedPost) => (
                  <CompactSuggestedCard key={`compact-${suggestedPost.slug}`} post={suggestedPost} />
                ))}
              </div>
            </aside>
          </div>

          <div className="relative mt-8 overflow-hidden border border-slate-200 bg-slate-100 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
            <div className="relative h-[14rem] sm:h-[20rem] lg:h-[26rem]">
              <LiveArticleCover post={post} />
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[290px_minmax(0,1fr)] lg:px-8">
          <aside className="space-y-6">
            {headings.length ? (
              <div className="border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
                <div className="text-sm font-semibold text-slate-500">فهرس المقال</div>
                <TocTree items={tocTree} />
              </div>
            ) : null}

            <div className="border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
              <div className="text-sm font-semibold text-slate-500">معلومات المقال</div>
              <div className="mt-4 space-y-4">
                <InfoBox label="التصنيف" value={post.category || "عام"} />
                <InfoBox label="تاريخ النشر" value={formatArabicDate(post.publishedAt || post.createdAt)} />
                <InfoBox label="وقت القراءة" value={`${readingTime} دقائق`} />
              </div>
            </div>

            <EditorialTrustBox post={post} />

            <NewsletterSignup categories={categories} defaultCategory={post.category || ""} compact />

            {popularSuggestions.length ? (
              <div className="border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
                <div className="text-sm font-semibold text-slate-500">الأكثر قراءة</div>
                <div className="mt-4 space-y-3">
                  {popularSuggestions.map((popularPost) => (
                    <CompactSuggestedCard key={`popular-${popularPost.slug}`} post={popularPost} />
                  ))}
                </div>
              </div>
            ) : null}

            {(post.tags || []).length ? (
              <div className="border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
                <div className="text-sm font-semibold text-slate-500">الوسوم</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {quickCategories.length ? (
              <div className="border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
                <div className="text-sm font-semibold text-slate-500">تصنيفات سريعة</div>
                <div className="mt-4 flex flex-col gap-3">
                  {quickCategories.map((category) => (
                    <Link
                      key={category}
                      href={`/?category=${encodeURIComponent(category)}`}
                      className="border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
              <div className="text-sm font-semibold text-slate-500">انتقال سريع</div>
              <div className="mt-4 flex flex-col gap-3">
                <Link href="/" className="border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700">
                  العودة إلى الرئيسية
                </Link>
                <Link
                  href={post.category ? `/?category=${encodeURIComponent(post.category)}` : "/"}
                  className="border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
                >
                  المزيد من قسم {post.category || "المقالات"}
                </Link>
              </div>
            </div>
          </aside>

          <article className="border border-slate-200 bg-white px-6 py-8 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.45)] sm:px-8 sm:py-10">
            <div className="blog-prose max-w-none" dangerouslySetInnerHTML={{ __html: htmlWithAnchors }} />
          </article>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ArticleComments postId={post.id} />
        </div>
      </section>

      {relatedPosts.length ? (
        <section className="pb-16 sm:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="text-right">
                <div className="text-xs font-extrabold tracking-[0.18em] text-red-700">مواد إضافية</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">مقالات ذات صلة</h2>
              </div>
              <span className="h-8 w-1 bg-red-700" />
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {relatedPosts.map((relatedPost) => (
                <RelatedCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
