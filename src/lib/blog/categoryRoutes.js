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
  const decodedSlug = decodeURIComponent(normalizedSlug);
  const readableCategory = decodedSlug.replace(/-+/g, " ").trim();

  return (
    (categories || []).find((category) => getCategorySlug(category) === normalizedSlug || getCategorySlug(category) === decodedSlug) ||
    readableCategory ||
    ""
  );
}
