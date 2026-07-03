import { site } from "@/config/site";
import { listContributorsPublic, listPostsForSitemap } from "@/lib/blog/posts";
import { getCategoryHref } from "@/lib/blog/categoryRoutes";
import { createSlugCandidate } from "@/lib/blog/slug";
import { absoluteUrl } from "@/lib/seo";

const staticRoutes = [
  "",
  "/about",
  "/sections",
  "/search",
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
  "/deletion",
  "/service-policies/verification",
  "/service-policies/tools",
  "/service-policies/real-estate",
  "/service-policies/notes-sheets",
  "/service-policies/marriage",
  "/service-policies/marketplace",
  "/service-policies/jobs",
  "/service-policies/charity",
];

export default async function sitemap() {
  const now = new Date();
  const posts = await listPostsForSitemap();
  const { contributors } = await listContributorsPublic({ limit: 500 });
  const categories = [
    ...new Set(
      posts
        .flatMap((post) => [post.category, post.category_parent])
        .map((category) => String(category || "").trim())
        .filter(Boolean)
    ),
  ];
  const tags = [
    ...new Set(
      posts
        .flatMap((post) => (Array.isArray(post.tags) ? post.tags : []))
        .map((tag) => String(tag || "").trim())
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
    ...contributors.map((contributor) => ({
      url: absoluteUrl(`/contributors/${contributor.id}`),
      lastModified: contributor.lastPublishedAt || now,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...categories.map((category) => ({
      url: absoluteUrl(getCategoryHref(category)),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    })),
    ...tags.map((tag) => ({
      url: absoluteUrl(`/tag/${createSlugCandidate(tag)}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
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
