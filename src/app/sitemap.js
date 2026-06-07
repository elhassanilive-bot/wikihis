import { site } from "@/config/site";
import { listPostsForSitemap } from "@/lib/blog/posts";

const staticRoutes = [
  "",
  "/about",
  "/sections",
  "/contributors",
  "/contact",
  "/contribute",
  "/features",
  "/help-center",
  "/faq",
  "/privacy",
  "/terms",
  "/agreements",
  "/editorial-policy",
  "/corrections-policy",
  "/security",
  "/dmca",
  "/disclaimer",
  "/download",
  "/report-issue",
  "/complaints",
];

function absoluteUrl(path) {
  return new URL(path || "/", site.url).toString();
}

export default async function sitemap() {
  const now = new Date();
  const posts = await listPostsForSitemap();
  const categories = [
    ...new Set(
      posts
        .flatMap((post) => [post.category, post.category_parent])
        .map((category) => String(category || "").trim())
        .filter(Boolean)
    ),
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route),
      lastModified: now,
      changeFrequency: route ? "weekly" : "daily",
      priority: route ? 0.7 : 1,
    })),
    ...categories.map((category) => ({
      url: absoluteUrl(`/?category=${encodeURIComponent(category)}`),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    })),
    ...posts
      .filter((post) => post.slug)
      .map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: post.updated_at || post.published_at || post.created_at || now,
        changeFrequency: "weekly",
        priority: 0.85,
      })),
  ];
}
