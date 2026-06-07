import { createSlugCandidate } from "@/lib/blog/slug";

export function getCategorySlug(category) {
  return createSlugCandidate(category);
}

export function getCategoryHref(category) {
  const slug = getCategorySlug(category);
  return slug ? `/category/${encodeURIComponent(slug)}` : "/";
}

export function resolveCategoryFromSlug(categories, slug) {
  const normalizedSlug = String(slug || "").trim();
  return (
    (categories || []).find((category) => getCategorySlug(category) === normalizedSlug) ||
    ""
  );
}
