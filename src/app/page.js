import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import ContributorsSpotlight from "@/components/blog/ContributorsSpotlight";
import NewsTickerClient from "@/components/blog/NewsTickerClient";
import HomeTabsPanel from "@/components/blog/HomeTabsPanel";
import PostCardBookmarkButton from "@/components/blog/PostCardBookmarkButton";
import { listContributorsPublic, listPostCategories, listPostsDetailed } from "@/lib/blog/posts";
import { estimateReadingTime, formatArabicDate } from "@/lib/blog/render";

export const revalidate = 60;

export const metadata = {
  title: "ويكيهيس | Wikihis",
  description: "ويكيهيس هي جريدة إلكترونية عربية متعددة التخصصات تقدم المقالات والأخبار والتحليلات، وتتيح للمساهمين نشر مقالاتهم في مجالات متنوعة.",
  alternates: { canonical: "/" },
};

const POSTS_PER_PAGE = 15;
const SUBCATEGORY_SECTION_COUNT = 4;
const SUBCATEGORY_POST_FETCH_LIMIT = 80;
const SUBCATEGORY_SIDE_POST_COUNT = 5;
const PRIORITY_CATEGORIES = [
  "تكنولوجيا",
  "الأخبار",
  "الصحة واللياقة",
  "البيت والأسرة",
  "قضايا المرأة",
  "المجتمع",
  "عالم الحيوانات",
  "تفسير الأحلام",
  "منوعات",
  "التاريخ",
  "الاستثمار",
  "الرياضة",
  "السفر",
  "السياسة",
  "الفنون",
  "البيئة",
  "تطوير الذات",
  "اقتصاد",
  "الصحة النفسية",
  "المرأة",
];
const CATEGORY_CHILDREN = {
  "قضايا المرأة": ["حقوق المرأة", "اهتمامات المرأة", "صحة الجهاز التناسلي", "الحمل والولادة"],
  "الصحة واللياقة": ["الصحة النفسية", "النوم الصحي", "الأكل الصحي اليومي", "تمارين منزلية"],
  "الرياضة": ["الرياضة البدنية", "اليوجا"],
  "البيت والأسرة": ["تنظيم البيت", "تربية الأطفال", "أكلات سريعة", "العلاقة الزوجية"],
};

function hasRealCoverImage(post) {
  return Boolean(String(post?.coverImageUrl || "").trim());
}

function normalizePage(value) {
  const page = Number.parseInt(String(value || "1"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildPageHref({ page, category }) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (category) {
    params.set("category", category);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function getPaginationRange(currentPage, totalPages) {
  if (totalPages <= 1) return [1];

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  for (let index = currentPage - 2; index <= currentPage + 2; index += 1) {
    if (index >= 1 && index <= totalPages) {
      pages.add(index);
    }
  }

  return [...pages].sort((first, second) => first - second);
}

function buildSidebarCategoryTree(categories) {
  const unique = [...new Set(categories.map((category) => String(category || "").trim()).filter(Boolean))];
  const childSet = new Set(Object.values(CATEGORY_CHILDREN).flat());

  const parentCandidates = [
    ...PRIORITY_CATEGORIES.filter((category) => unique.includes(category)),
    ...unique.filter((category) => !PRIORITY_CATEGORIES.includes(category) && !childSet.has(category)),
  ];

  const groups = parentCandidates.map((category) => ({
    name: category,
    children: (CATEGORY_CHILDREN[category] || []).filter((child) => unique.includes(child)),
  }));

  const groupedChildren = new Set(groups.flatMap((group) => group.children));
  const remaining = unique.filter((category) => !parentCandidates.includes(category) && !groupedChildren.has(category));

  return {
    prioritizedGroups: groups.filter((group) => PRIORITY_CATEGORIES.includes(group.name)),
    remaining,
  };
}

function buildSubcategoryShowcase(posts) {
  const childCategories = new Set(Object.values(CATEGORY_CHILDREN).flat());
  const grouped = new Map();
  const groupedAll = new Map();
  const uniquePosts = [];
  const seenSlugs = new Set();

  posts.forEach((post) => {
    const category = String(post.category || "").trim();
    if (!post?.slug || seenSlugs.has(post.slug)) return;
    seenSlugs.add(post.slug);
    uniquePosts.push(post);

    if (category) {
      if (!groupedAll.has(category)) groupedAll.set(category, []);
      groupedAll.get(category).push(post);
    }

    if (!childCategories.has(category)) return;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(post);
  });

  const primarySections = [...grouped.entries()]
    .sort((a, b) => {
      const countDifference = b[1].length - a[1].length;
      if (countDifference !== 0) return countDifference;

      const aNewest = new Date(a[1][0]?.publishedAt || a[1][0]?.createdAt || 0).getTime();
      const bNewest = new Date(b[1][0]?.publishedAt || b[1][0]?.createdAt || 0).getTime();
      return bNewest - aNewest;
    })
    .map(([category, items]) => ({
      title: category,
      href: buildPageHref({ page: 1, category }),
      lead: items[0],
      side: items.slice(1, 1 + SUBCATEGORY_SIDE_POST_COUNT),
      isChildCategory: true,
    }))
    .filter((section) => section.lead);

  const usedTitles = new Set(primarySections.map((section) => section.title));
  const fallbackSections = [...groupedAll.entries()]
    .filter(([category, items]) => !usedTitles.has(category) && items[0])
    .sort((a, b) => {
      const countDifference = b[1].length - a[1].length;
      if (countDifference !== 0) return countDifference;

      const aNewest = new Date(a[1][0]?.publishedAt || a[1][0]?.createdAt || 0).getTime();
      const bNewest = new Date(b[1][0]?.publishedAt || b[1][0]?.createdAt || 0).getTime();
      return bNewest - aNewest;
    })
    .map(([category, items]) => ({
      title: category,
      href: buildPageHref({ page: 1, category }),
      lead: items[0],
      side: items.slice(1, 1 + SUBCATEGORY_SIDE_POST_COUNT),
      isChildCategory: false,
    }));

  return [...primarySections, ...fallbackSections]
    .slice(0, SUBCATEGORY_SECTION_COUNT)
    .map((section) => {
      const used = new Set([section.lead.slug, ...section.side.map((item) => item.slug)]);
      const filler = uniquePosts
        .filter((post) => !used.has(post.slug))
        .slice(0, Math.max(0, SUBCATEGORY_SIDE_POST_COUNT - section.side.length));

      return {
        ...section,
        side: [...section.side, ...filler].slice(0, SUBCATEGORY_SIDE_POST_COUNT),
      };
    })
    .filter((section) => section.lead);
}

function EmptyState({ title, description, href, label }) {
  const shouldRenderAction = href && label && label !== "إضافة أول مقال";

  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_24px_60px_-50px_rgba(15,23,42,0.45)]">
      <h2 className="text-2xl font-extrabold text-slate-950">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">{description}</p>
      {shouldRenderAction ? (
        <div className="mt-8">
          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-full bg-[var(--blog-accent)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--blog-accent-strong)]"
          >
            {label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function LivePostVisual({ post, className = "", priority = false, compact = false, sizes = "100vw" }) {
  if (hasRealCoverImage(post)) {
    return (
      <BlogImage
        src={post.coverImageUrl}
        alt={post.title}
        fill
        priority={priority}
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <div
      className={[
        "absolute inset-0 flex h-full w-full flex-col justify-between bg-[linear-gradient(135deg,#7f1d1d_0%,#991b1b_35%,#111827_100%)] text-white",
        compact ? "p-3" : "p-5 sm:p-7",
      ].join(" ")}
    >
      <div className="flex items-center justify-between text-[10px] font-bold text-white/75">
        <span className="rounded-full bg-white/12 px-2 py-1">{post.category || "مقال"}</span>
        <span>{formatArabicDate(post.publishedAt || post.createdAt)}</span>
      </div>
      <div className="space-y-3 text-right">
        <div className={`font-black ${compact ? "line-clamp-2 text-sm leading-6" : "line-clamp-3 text-2xl leading-[1.6] sm:text-3xl"}`}>
          {post.title}
        </div>
        <div className={`text-white/80 ${compact ? "line-clamp-2 text-[11px] leading-5" : "line-clamp-3 text-sm leading-7"}`}>
          {post.excerpt}
        </div>
      </div>
      <div className="flex justify-start">
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/90">
          محتوى المقال
        </span>
      </div>
    </div>
  );
}

function HeroLead({ post }) {
  const readingTime = estimateReadingTime(post.content);

  return (
    <article className="overflow-hidden bg-[#1f1f1f]">
      <Link href={`/blog/${post.slug}`} className="grid h-full gap-0 lg:grid-cols-[0.52fr_0.48fr]">
        <div className="flex flex-col justify-between border-l border-white/10 p-5 text-white sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/70">
              <span className="inline-flex items-center bg-red-700 px-2 py-1 text-white">{post.category || "عام"}</span>
              <span>{formatArabicDate(post.publishedAt || post.createdAt)}</span>
              <span>{readingTime} دقائق</span>
            </div>
            <h1 className="mt-4 line-clamp-3 text-2xl font-black leading-[1.65] text-white sm:text-3xl lg:text-[2.15rem]">
              {post.title}
            </h1>
            <p className="mt-4 line-clamp-3 text-sm leading-8 text-white/78">{post.excerpt}</p>
          </div>
        </div>

        <div className="relative min-h-[280px] bg-slate-800 sm:min-h-[360px] lg:min-h-[460px]">
          <LivePostVisual
            post={post}
            priority
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
        </div>
      </Link>
    </article>
  );
}

function SideHeadline({ post }) {
  return (
    <article className="border-b border-white/10 last:border-b-0">
      <Link href={`/blog/${post.slug}`} className="grid grid-cols-[1fr_84px] gap-3 p-3 transition hover:bg-white/5">
        <div className="text-right">
          <div className="inline-flex bg-red-700 px-2 py-0.5 text-[10px] font-bold text-white">{post.category || "عام"}</div>
          <h2 className="mt-2 line-clamp-3 text-[13px] font-extrabold leading-6 text-white">{post.title}</h2>
        </div>
        <div className="relative h-16 overflow-hidden bg-slate-700">
          <LivePostVisual post={post} compact sizes="84px" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/15" />
        </div>
      </Link>
    </article>
  );
}

function EditorialCard({ post, tone = "light" }) {
  const dark = tone === "dark";

  return (
    <article
      className={[
        "border p-4",
        dark ? "border-slate-800 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950",
      ].join(" ")}
    >
      <Link href={`/blog/${post.slug}`} className="block">
        <div className={`text-[11px] font-extrabold ${dark ? "text-red-300" : "text-red-700"}`}>{post.category || "ملف"}</div>
        <h3 className={`mt-2 line-clamp-2 text-lg font-black leading-8 ${dark ? "text-white" : "text-slate-950"}`}>{post.title}</h3>
        <p className={`mt-3 line-clamp-3 text-sm leading-7 ${dark ? "text-white/75" : "text-slate-600"}`}>{post.excerpt}</p>
        <div className={`mt-4 text-xs font-bold ${dark ? "text-white/65" : "text-slate-500"}`}>
          {formatArabicDate(post.publishedAt || post.createdAt)}
        </div>
      </Link>
    </article>
  );
}

function EditorialPanel({ posts }) {
  const items = posts.slice(0, 3);
  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        {items[0] ? <EditorialCard post={items[0]} tone="dark" /> : null}
        {items.slice(1).map((post) => (
          <EditorialCard key={`editorial-${post.slug}`} post={post} />
        ))}
      </div>
    </section>
  );
}

function CategoryIcon({ category }) {
  const value = String(category || "");
  const common = "h-5 w-5";

  if (/صحة الأم/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 20c0-3 1.8-5 3.5-5s3.5 2 3.5 5M9.5 13.5c.8 1 1.6 1.5 2.5 1.5s1.7-.5 2.5-1.5" />
      </svg>
    );
  }

  if (/الوجبات|التغذية/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v8M6 4v8M6 8h2M14 4v16M18 4c0 3-2 4-2 6v10" />
      </svg>
    );
  }

  if (/الطبخ/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 11h12a2 2 0 0 1 2 2v3H7a2 2 0 0 1-2-2v-3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V9a3 3 0 0 1 3-3h2" />
      </svg>
    );
  }

  if (/اليوجا/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="6.5" r="2.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 0-4 2m4-2 4 2m-8 3 4-2 4 2" />
      </svg>
    );
  }

  if (/النوم|الراحة/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 15a6 6 0 1 1-6-9 5 5 0 0 0 6 9Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 5h.01M5 8h.01" />
      </svg>
    );
  }

  if (/حقوق المرأة/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5 5 8v4c0 4 3 6.5 7 7 4-.5 7-3 7-7V8l-7-3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h4M12 10v4" />
      </svg>
    );
  }

  if (/إعدادات المرأة/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5 7 17M17 17l1.5 1.5M5.5 5.5 7 7" />
      </svg>
    );
  }

  if (/الرياضة البدنية/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9h3v6H6m9-6h3v6h-3M9 12h6" />
      </svg>
    );
  }

  if (/التكنولوجيا|تقنية|الذكاء/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="5" width="16" height="11" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 19h8M10 16v3M14 16v3" />
      </svg>
    );
  }

  if (/التاريخ/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
      </svg>
    );
  }

  if (/الاستثمار/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 17l4-4 3 3 7-7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 9h5v5" />
      </svg>
    );
  }

  if (/الرياضة/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6M15 9l-6 6" />
      </svg>
    );
  }

  if (/السفر/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11h18M6 15l3-8 3 4 3-2 3 6" />
      </svg>
    );
  }

  if (/السياسة/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M6 17V8l6-3 6 3v9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h.01M15 11h.01" />
      </svg>
    );
  }

  if (/الفنون/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4c4.4 0 8 2.9 8 6.5S16.4 17 12 17h-1a2 2 0 0 0-2 2v1" />
        <circle cx="8" cy="9" r="1" />
        <circle cx="12" cy="7.5" r="1" />
        <circle cx="15.5" cy="10" r="1" />
      </svg>
    );
  }

  if (/الحيوانات/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 14c0-2 2-4 5-4s5 2 5 4-2 4-5 4-5-2-5-4Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9 7 7M12 8V6M16 9l1-2" />
      </svg>
    );
  }

  if (/البيئة/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20c4-3 6-6.5 6-10a9 9 0 0 0-12 0c0 3.5 2 7 6 10Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10c1.5 1 2.5 2.5 3 4" />
      </svg>
    );
  }

  if (/تطوير الذات/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M5 11l7-7 7 7" />
      </svg>
    );
  }

  if (/اقتصاد|مال|أعمال/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V9m7 10V5m7 14v-7" />
      </svg>
    );
  }

  if (/الصحة النفسية/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20c-4.5-3.2-7-6.1-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5c0 3.4-2.5 6.3-7 9.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5h1.5l1-2 1 4 1-2H16" />
      </svg>
    );
  }

  if (/صحة|طب/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (/المرأة/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="9" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 13v7M9 17h6" />
      </svg>
    );
  }

  if (/سياسة|عالم|شرق/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" />
      </svg>
    );
  }

  if (/مرأة|أسرة|مجتمع/.test(value)) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v6M9 17h6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12v14H6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

function CategoriesSidebar({ categories, currentCategory }) {
  if (!categories.length) return null;

  const { prioritizedGroups, remaining } = buildSidebarCategoryTree(categories);

  function CategoryTreeLink({ category, nested = false }) {
    return (
      <Link
        href={buildPageHref({ page: 1, category })}
        className={[
          "group flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-right transition",
          currentCategory === category
            ? "border-red-200 bg-red-50/40"
            : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/30",
          nested ? "py-2.5" : "",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-950">
            <CategoryIcon category={category} />
          </div>
          <span className={`line-clamp-1 text-slate-900 ${nested ? "text-[13px] font-semibold" : "text-sm font-bold"}`}>{category}</span>
        </div>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-red-700" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
        </svg>
      </Link>
    );
  }

  return (
    <aside className="self-start border border-slate-200 bg-white p-4 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.35)] lg:sticky lg:top-24">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="text-right">
          <div className="text-xs font-extrabold tracking-[0.18em] text-red-700">التصفح</div>
          <h2 className="mt-1 text-2xl font-black text-slate-950">استعرض التصنيفات</h2>
        </div>
        <span className="h-8 w-1 bg-red-700" />
      </div>

      <div className="space-y-2">
        <Link
          href={buildPageHref({ page: 1, category: "" })}
          className={[
            "group flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-right transition",
            currentCategory
              ? "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/30"
              : "border-red-200 bg-red-50/40",
          ].join(" ")}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-950">
              <CategoryIcon category="عام" />
            </div>
            <span className="line-clamp-1 text-sm font-bold text-slate-900">كل التصنيفات</span>
          </div>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-red-700" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        </Link>

        {prioritizedGroups.map((group) => (
          <div key={group.name}>
            <CategoryTreeLink category={group.name} />
            {group.children.length ? (
              <div className="relative mt-1 mr-3 border-r border-slate-400 pr-4">
                {group.children.map((child) => (
                  <div key={child} className="relative">
                    <span className="absolute right-[-17px] top-4 h-px w-3 bg-slate-400" />
                    <CategoryTreeLink category={child} nested />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        {remaining.length ? (
          <details className="group rounded-xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-right">
              <span className="text-sm font-bold text-slate-900">عرض المزيد</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
              </svg>
            </summary>
            <div className="space-y-2 border-t border-slate-200 p-2">
              {remaining.map((category) => (
                <CategoryTreeLink key={category} category={category} />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </aside>
  );
}

function PostGridCard({ post, index }) {
  const mobileVisibility = index >= 10 ? "hidden lg:block" : "";

  return (
    <article className={`overflow-hidden border border-slate-200 bg-white shadow-[0_18px_45px_-38px_rgba(15,23,42,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-38px_rgba(15,23,42,0.45)] ${mobileVisibility}`}>
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative h-40 bg-slate-200 sm:h-44 xl:h-48">
          <LivePostVisual
            post={post}
            compact
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="h-full w-full object-cover"
          />
          <PostCardBookmarkButton postId={post.id} slug={post.slug} />
          <div className="absolute left-3 top-3 bg-[#163d7a] px-2 py-1 text-[10px] font-bold text-white">
            {post.category || "خبر"}
          </div>
        </div>
        <div className="p-4 text-right">
          <h3 className="line-clamp-2 text-[15px] font-black leading-7 text-slate-950">{post.title}</h3>
          <p className="mt-2 line-clamp-2 text-[12px] leading-6 text-slate-500">{post.excerpt}</p>
          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-bold text-slate-400">
            <span>{formatArabicDate(post.publishedAt || post.createdAt)}</span>
            <span>{estimateReadingTime(post.content)} دقائق</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function SubcategorySideItem({ post }) {
  return (
    <article className="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
      <Link href={`/blog/${post.slug}`} className="grid grid-cols-[74px_1fr] gap-3">
        <div className="relative h-16 overflow-hidden bg-slate-200">
          <LivePostVisual post={post} compact sizes="74px" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 text-right">
          <h4 className="line-clamp-2 text-[12px] font-bold leading-5 text-slate-900">{post.title}</h4>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{post.excerpt}</p>
        </div>
      </Link>
    </article>
  );
}

function SubcategoryShowcaseCard({ section }) {
  return (
    <section className="border border-slate-200 bg-white p-3 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.35)] sm:p-4">
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="text-right">
          <div className="text-[11px] font-extrabold tracking-[0.16em] text-red-700">ملفات فرعية</div>
          <Link href={section.href} className="mt-1 block text-right text-lg font-black text-slate-950 transition hover:text-red-700">
            {section.title}
          </Link>
        </div>
        <span className="h-5 w-1 bg-red-700" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_260px]">
        <article className="overflow-hidden border border-slate-200 bg-white">
          <Link href={`/blog/${section.lead.slug}`} className="block">
            <div className="relative h-60 bg-slate-200 sm:h-64">
              <LivePostVisual
                post={section.lead}
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="h-full w-full object-cover"
              />
              <div className="absolute left-3 top-3 bg-red-700 px-2 py-1 text-[10px] font-bold text-white">{section.title}</div>
            </div>
            <div className="p-4 text-right">
              <h3 className="line-clamp-2 text-lg font-black leading-8 text-slate-950">{section.lead.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-500">{section.lead.excerpt}</p>
            </div>
          </Link>
        </article>

        <div className="space-y-3">
          {section.side.map((post) => (
            <SubcategorySideItem key={`${section.title}-${post.slug}`} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Pagination({ currentPage, totalPages, currentCategory }) {
  if (totalPages <= 1) return null;

  const pages = getPaginationRange(currentPage, totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="ترقيم صفحات المقالات">
      <Link
        href={buildPageHref({ page: Math.max(1, currentPage - 1), category: currentCategory })}
        aria-disabled={currentPage === 1}
        className={[
          "rounded-sm border px-4 py-2 text-sm font-extrabold transition",
          currentPage === 1
            ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-300 bg-white text-slate-800 hover:border-red-700 hover:text-red-700",
        ].join(" ")}
      >
        السابق
      </Link>

      {pages.map((page, index) => {
        const previous = pages[index - 1];
        const showGap = previous && page - previous > 1;

        return (
          <span key={page} className="contents">
            {showGap ? <span className="px-1 text-slate-400">...</span> : null}
            <Link
              href={buildPageHref({ page, category: currentCategory })}
              aria-current={currentPage === page ? "page" : undefined}
              className={[
                "flex h-10 min-w-10 items-center justify-center rounded-sm border px-3 text-sm font-extrabold transition",
                currentPage === page
                  ? "border-red-700 bg-red-700 text-white"
                  : "border-slate-300 bg-white text-slate-800 hover:border-red-700 hover:text-red-700",
              ].join(" ")}
            >
              {page}
            </Link>
          </span>
        );
      })}

      <Link
        href={buildPageHref({ page: Math.min(totalPages, currentPage + 1), category: currentCategory })}
        aria-disabled={currentPage === totalPages}
        className={[
          "rounded-sm border px-4 py-2 text-sm font-extrabold transition",
          currentPage === totalPages
            ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-300 bg-white text-slate-800 hover:border-red-700 hover:text-red-700",
        ].join(" ")}
      >
        التالي
      </Link>
    </nav>
  );
}

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const currentPage = normalizePage(resolvedSearchParams?.page);
  const currentCategory = String(resolvedSearchParams?.category || "").trim();

  const [{ posts, error, totalPages }, { categories }, { posts: showcasePosts }, { contributors }] = await Promise.all([
    listPostsDetailed({ limit: POSTS_PER_PAGE, page: currentPage, category: currentCategory || null }),
    listPostCategories(),
    listPostsDetailed({ limit: SUBCATEGORY_POST_FETCH_LIMIT, page: 1 }),
    listContributorsPublic({ limit: 300 }),
  ]);

  const [featuredPost, ...headlinePosts] = posts;
  const editorialPosts = headlinePosts.slice(5, 8);
  const subcategorySections = buildSubcategoryShowcase(showcasePosts);

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-slate-950">
      <section className="bg-[#222] pt-6">
        <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          {error ? (
            <EmptyState
              title="تعذر تحميل المقالات"
              description={`حدثت مشكلة أثناء قراءة مقالات المدونة من قاعدة البيانات. الرسالة: ${error}`}
              href="/admin/blog"
              label="مراجعة الإعدادات"
            />
          ) : posts.length === 0 ? (
            <EmptyState
              title="لا توجد مقالات منشورة بعد"
              description="بمجرد نشر المقالات من لوحة الإدارة ستظهر هنا مباشرة في الصفحة الرئيسية."
              href="/admin/blog"
              label="إضافة أول مقال"
            />
          ) : (
            <div className="overflow-hidden border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
                <h2 className="text-right text-xl font-black">ويكيهيس</h2>
                <div className="mx-4 hidden min-w-0 flex-1 lg:block">
                  <NewsTickerClient />
                </div>
                <span className="h-5 w-1 shrink-0 bg-red-700" />
              </div>
              <div className="grid lg:grid-cols-[270px_minmax(0,1fr)]">
                <aside className="order-2 bg-[#242424] lg:order-1">
                  {headlinePosts.slice(0, 4).map((post) => (
                    <SideHeadline key={`side-${post.slug}`} post={post} />
                  ))}
                </aside>
                <div className="order-1 lg:order-2">{featuredPost ? <HeroLead post={featuredPost} /> : null}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {!error && posts.length > 0 ? (
        <>
          <EditorialPanel posts={editorialPosts} />

          <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-right text-2xl font-black text-slate-950">أحدث المنشورات</h2>
                  <span className="h-6 w-1 shrink-0 bg-red-700" />
                </div>
                <div className="grid items-start gap-5 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {posts.map((post, index) => (
                    <PostGridCard key={`grid-${post.slug}`} post={post} index={index} />
                  ))}
                </div>
              </div>
              <CategoriesSidebar categories={categories} currentCategory={currentCategory} />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
            <div className="border border-slate-200 bg-white px-4 py-6 sm:px-6">
              <Pagination currentPage={currentPage} totalPages={totalPages} currentCategory={currentCategory} />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <ContributorsSpotlight
              contributors={contributors}
              title="الناشرون البارزون"
              description="الترتيب هنا يعتمد على عدد المقالات المنشورة والمقبولة لكل مساهم."
              limit={6}
            />
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <HomeTabsPanel posts={posts} featuredPosts={[featuredPost, ...headlinePosts, ...editorialPosts]} />
          </section>

          {subcategorySections.length ? (
            <section className="mx-auto max-w-7xl px-4 pb-18 sm:px-6 lg:px-8">
              <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-right text-2xl font-black text-slate-950">التصنيفات الفرعية</h2>
                <span className="h-6 w-1 shrink-0 bg-red-700" />
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                {subcategorySections.map((section) => (
                  <SubcategoryShowcaseCard key={section.title} section={section} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

