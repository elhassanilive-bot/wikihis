import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createSlugCandidate } from "@/lib/blog/slug";

const POST_LIST_COLUMNS =
  "id,slug,title,excerpt,content,cover_image_url,category,category_parent,category_slug,tags,published_at,created_at,updated_at,status,author_user_id,author_display_name,author_avatar_url,reviewed_at,review_note";
const BLOG_PUBLIC_TABLE = "wikihes_blog_posts";
const BLOG_WRITE_TABLE = "blog_posts";
const PROJECT_KEY_COLUMN_MISSING_RE = /column\s+blog_posts\.project_key\s+does\s+not\s+exist/i;

export function isBlogEnabled() {
  return isSupabaseConfigured();
}

export function isBlogPublishingEnabled() {
  return isSupabaseAdminConfigured();
}

function formatSupabaseError(error) {
  const message = String(error?.message || error || "").trim();
  if (/invalid schema\s*:\s*shima/i.test(message)) {
    return "Vercel ما زال يرسل NEXT_PUBLIC_SUPABASE_DB_SCHEMA=shima. احذفه أو غيّره إلى public من Environment Variables ثم أعد النشر.";
  }
  if (PROJECT_KEY_COLUMN_MISSING_RE.test(message)) {
    return "جدول blog_posts في Supabase قديم ولا يحتوي project_key. شغّل supabase/004_wikihes_project_isolation.sql أو استخدم قاعدة بيانات المشروع الجديدة.";
  }
  if (/permission denied for table\s+blog_posts/i.test(message)) {
    return "صلاحية النشر مرفوضة. أضف SUPABASE_SERVICE_ROLE_KEY في .env.local ثم أعد تشغيل السيرفر.";
  }
  return message || "حدث خطأ غير متوقع أثناء الاتصال بقاعدة البيانات.";
}

function getMissingServiceRoleMessage() {
  return "SUPABASE_SERVICE_ROLE_KEY غير مضبوط. لوحة النشر تحتاج Service Role للنشر والتعديل والحذف.";
}

function normalizePost(row) {
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    coverImageUrl: row.cover_image_url,
    category: row.category,
    categoryParent: row.category_parent,
    categorySlug: row.category_slug,
    tags: row.tags || [],
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    authorUserId: row.author_user_id,
    authorDisplayName: row.author_display_name,
    authorAvatarUrl: row.author_avatar_url,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return [...new Set(tags.map((tag) => String(tag || "").trim()).filter(Boolean))];
}

async function getWriteClient() {
  return isSupabaseAdminConfigured() ? getSupabaseAdminClient() : null;
}

async function getAdminReadClient() {
  return isSupabaseAdminConfigured() ? getSupabaseAdminClient() : null;
}

async function ensureUniqueSlug(client, baseSlug, excludeId = null) {
  const fallbackBase = createSlugCandidate(baseSlug);
  let attempt = 0;

  while (attempt < 100) {
    const candidate = attempt === 0 ? fallbackBase : `${fallbackBase}-${attempt + 1}`;
    let query = client.from(BLOG_WRITE_TABLE).select("id, slug").eq("slug", candidate);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return { slug: candidate, error: formatSupabaseError(error) };
    }

    if (!data) {
      return { slug: candidate, error: null };
    }

    attempt += 1;
  }

  return { slug: `${fallbackBase}-${Date.now()}`, error: null };
}

export async function listPosts({ limit = 20 } = {}) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(BLOG_PUBLIC_TABLE)
    .select(POST_LIST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []).map(normalizePost);
}

export async function listPostsDetailed({ limit = 20, page = 1, category = null } = {}) {
  if (!isSupabaseConfigured()) return { posts: [], error: "Supabase غير مُعد", totalCount: 0, totalPages: 0, currentPage: 1 };

  const supabase = await getSupabaseClient();
  if (!supabase) return { posts: [], error: "Supabase client غير متاح", totalCount: 0, totalPages: 0, currentPage: 1 };

  const safeLimit = Math.max(1, Number(limit) || 20);
  const safePage = Math.max(1, Number(page) || 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  const normalizedCategory = String(category || "").trim();

  let query = supabase
    .from(BLOG_PUBLIC_TABLE)
    .select(POST_LIST_COLUMNS, { count: "exact" })
    .eq("status", "published");

  if (normalizedCategory) {
    const escapedCategory = normalizedCategory.replaceAll('"', '\\"');
    query = query.or(`category.eq."${escapedCategory}",category_parent.eq."${escapedCategory}"`);
  }

  const { data, error, count } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return {
      posts: [],
      error: formatSupabaseError(error),
      totalCount: 0,
      totalPages: 0,
      currentPage: safePage,
    };
  }

  const totalCount = count || 0;

  return {
    posts: (data || []).map(normalizePost),
    error: null,
    totalCount,
    totalPages: totalCount > 0 ? Math.ceil(totalCount / safeLimit) : 0,
    currentPage: safePage,
  };
}

export async function listPostCategories() {
  if (!isSupabaseConfigured()) return { categories: [], error: "Supabase غير مُعد" };

  const supabase = await getSupabaseClient();
  if (!supabase) return { categories: [], error: "Supabase client غير متاح" };

  const { data, error } = await supabase
    .from(BLOG_PUBLIC_TABLE)
    .select("category")
    .eq("status", "published")
    .not("category", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) return { categories: [], error: formatSupabaseError(error) };

  const categories = [...new Set((data || []).map((row) => String(row.category || "").trim()).filter(Boolean))];
  return { categories, error: null };
}

export async function listPostsForAdmin({ limit = 100 } = {}) {
  if (!isSupabaseConfigured()) return { posts: [], error: "Supabase غير مُعد" };

  const client = await getAdminReadClient();
  if (!client) return { posts: [], error: getMissingServiceRoleMessage() };

  const { data, error } = await client
    .from(BLOG_WRITE_TABLE)
    .select(POST_LIST_COLUMNS)
    .neq("status", "archived")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { posts: [], error: formatSupabaseError(error) };
  return { posts: (data || []).map(normalizePost), error: null };
}

export async function getPostBySlug(slug) {
  if (!isSupabaseConfigured()) return null;

  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(BLOG_PUBLIC_TABLE)
    .select(POST_LIST_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return normalizePost(data);
}

export async function getPostBySlugDetailed(slug) {
  if (!isSupabaseConfigured()) return { post: null, error: "Supabase غير مُعد" };

  const supabase = await getSupabaseClient();
  if (!supabase) return { post: null, error: "Supabase client غير متاح" };

  const { data, error } = await supabase
    .from(BLOG_PUBLIC_TABLE)
    .select(POST_LIST_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return { post: null, error: formatSupabaseError(error) };
  if (!data) return { post: null, error: null };
  return { post: normalizePost(data), error: null };
}

function normalizePostInput(input) {
  const title = String(input?.title || "").trim();
  const excerpt = String(input?.excerpt || "").trim();
  const content = String(input?.content || "").trim();
  const coverImageUrl = String(input?.coverImageUrl || "").trim() || null;
  const category = String(input?.category || "").trim() || null;
  const categoryParent = String(input?.categoryParent || "").trim() || null;
  const categorySlug = String(input?.categorySlug || "").trim() || null;
  const authorUserId = String(input?.authorUserId || "").trim() || null;
  const authorDisplayName = String(input?.authorDisplayName || "").trim() || null;
  const authorAvatarUrl = String(input?.authorAvatarUrl || "").trim() || null;
  const tags = normalizeTags(input?.tags);
  const desiredSlug = String(input?.slug || "").trim();

  return {
    title,
    excerpt,
    content,
    coverImageUrl,
    category,
    categoryParent,
    categorySlug,
    authorUserId,
    authorDisplayName,
    authorAvatarUrl,
    tags,
    desiredSlug,
  };
}

function validatePostInput(input) {
  const contentText = String(input.content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  const hasMedia = /<(img|video|audio|iframe|table)\b/i.test(String(input.content || ""));

  if (!input.title || !input.excerpt || (!input.content || (!contentText && !hasMedia))) {
    return "يرجى تعبئة العنوان والملخص والمحتوى.";
  }

  return null;
}

export async function createPost(input) {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const normalized = normalizePostInput(input);
  const validationError = validatePostInput(normalized);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const writer = await getWriteClient();
  if (!writer) {
    return { ok: false, error: getMissingServiceRoleMessage() };
  }

  const { slug, error: slugError } = await ensureUniqueSlug(
    writer,
    normalized.desiredSlug ? createSlugCandidate(normalized.desiredSlug) : createSlugCandidate(normalized.title)
  );

  if (slugError) {
    return { ok: false, error: slugError };
  }

  const { data, error } = await writer
    .from(BLOG_WRITE_TABLE)
    .insert({
      slug,
      title: normalized.title,
      excerpt: normalized.excerpt,
      content: normalized.content,
      cover_image_url: normalized.coverImageUrl,
      category: normalized.category,
      category_parent: normalized.categoryParent,
      category_slug: normalized.categorySlug,
      author_user_id: normalized.authorUserId,
      author_display_name: normalized.authorDisplayName,
      author_avatar_url: normalized.authorAvatarUrl,
      tags: normalized.tags,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id, slug")
    .maybeSingle();

  if (error) {
    const message =
      error.code === "23505"
        ? "يوجد مقال آخر بنفس الرابط المختصر. غيّر العنوان أو slug ثم أعد المحاولة."
        : formatSupabaseError(error);

    return { ok: false, error: message };
  }

  return { ok: true, slug: data?.slug || slug, id: data?.id || null };
}

export async function updatePost(input) {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const id = String(input?.id || "").trim();
  if (!id) {
    return { ok: false, error: "معرّف المقال مطلوب للتعديل." };
  }

  const normalized = normalizePostInput(input);
  const validationError = validatePostInput(normalized);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const writer = await getWriteClient();
  if (!writer) {
    return { ok: false, error: getMissingServiceRoleMessage() };
  }

  const { slug, error: slugError } = await ensureUniqueSlug(
    writer,
    normalized.desiredSlug ? createSlugCandidate(normalized.desiredSlug) : createSlugCandidate(normalized.title),
    id
  );

  if (slugError) {
    return { ok: false, error: slugError };
  }

  const { data, error } = await writer
    .from(BLOG_WRITE_TABLE)
    .update({
      slug,
      title: normalized.title,
      excerpt: normalized.excerpt,
      content: normalized.content,
      cover_image_url: normalized.coverImageUrl,
      category: normalized.category,
      category_parent: normalized.categoryParent,
      category_slug: normalized.categorySlug,
      author_user_id: normalized.authorUserId,
      author_display_name: normalized.authorDisplayName,
      author_avatar_url: normalized.authorAvatarUrl,
      tags: normalized.tags,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();

  if (error) {
    return { ok: false, error: formatSupabaseError(error) };
  }

  return { ok: true, slug: data?.slug || slug, id: data?.id || id };
}

export async function deletePost(id) {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const postId = String(id || "").trim();
  if (!postId) {
    return { ok: false, error: "معرّف المقال مطلوب للحذف." };
  }

  const writer = await getWriteClient();
  if (!writer) {
    return { ok: false, error: getMissingServiceRoleMessage() };
  }

  const { error } = await writer.from(BLOG_WRITE_TABLE).delete().eq("id", postId);

  if (!error) {
    return { ok: true, deleted: true };
  }

  const canFallbackToArchive = !isSupabaseAdminConfigured();
  if (!canFallbackToArchive) {
    return { ok: false, error: formatSupabaseError(error) };
  }

  const { error: archiveError } = await writer
    .from(BLOG_WRITE_TABLE)
    .update({
      status: "archived",
      published_at: null,
    })
    .eq("id", postId);

  if (archiveError) {
    return { ok: false, error: formatSupabaseError(error) };
  }

  return { ok: true, archived: true };
}

export async function deletePosts(ids = []) {
  const normalizedIds = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];

  if (!normalizedIds.length) {
    return { ok: false, error: "لم يتم تحديد أي مقالات للحذف." };
  }

  const results = [];

  for (const id of normalizedIds) {
    const result = await deletePost(id);
    results.push({ id, ...result });
  }

  const failed = results.filter((result) => !result.ok);
  const deletedCount = results.filter((result) => result.ok).length;

  if (failed.length) {
    return {
      ok: false,
      error: failed[0]?.error || "تعذر حذف بعض المقالات المحددة.",
      deletedCount,
      failedCount: failed.length,
      results,
    };
  }

  return {
    ok: true,
    deletedCount,
    results,
  };
}

export async function listContributorsPublic({ limit = 60 } = {}) {
  if (!isSupabaseConfigured()) return { contributors: [], error: "Supabase غير مُعد" };

  const supabase = await getSupabaseClient();
  if (!supabase) return { contributors: [], error: "Supabase client غير متاح" };

  const { data, error } = await supabase
    .from(BLOG_PUBLIC_TABLE)
    .select("id, author_user_id, author_display_name, author_avatar_url, published_at, created_at")
    .eq("status", "published")
    .not("author_user_id", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(Math.max(1, Number(limit) || 60));

  if (error) return { contributors: [], error: formatSupabaseError(error) };

  const grouped = new Map();

  (data || []).forEach((row) => {
    const key = String(row.author_user_id || "").trim();
    if (!key) return;

    const current = grouped.get(key) || {
      id: key,
      displayName: row.author_display_name || "مساهم",
      avatarUrl: row.author_avatar_url || "",
      postsCount: 0,
      lastPublishedAt: row.published_at || row.created_at || null,
    };

    current.postsCount += 1;
    const currentDate = new Date(current.lastPublishedAt || 0).getTime();
    const nextDate = new Date(row.published_at || row.created_at || 0).getTime();
    if (nextDate > currentDate) current.lastPublishedAt = row.published_at || row.created_at || null;

    grouped.set(key, current);
  });

  const contributors = [...grouped.values()].sort((a, b) => {
    const countDifference = b.postsCount - a.postsCount;
    if (countDifference !== 0) return countDifference;
    return new Date(b.lastPublishedAt || 0).getTime() - new Date(a.lastPublishedAt || 0).getTime();
  });

  return { contributors, error: null };
}

export async function listMemberPostsForAdmin({ limit = 120 } = {}) {
  if (!isSupabaseConfigured()) return { posts: [], error: "Supabase غير مُعد" };

  const client = await getAdminReadClient();
  if (!client) return { posts: [], error: getMissingServiceRoleMessage() };

  const { data, error } = await client
    .from(BLOG_WRITE_TABLE)
    .select(POST_LIST_COLUMNS)
    .not("author_user_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { posts: [], error: formatSupabaseError(error) };
  return { posts: (data || []).map(normalizePost), error: null };
}

export async function reviewMemberPost({ id, decision, reviewNote = "" }) {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured" };

  const client = await getWriteClient();
  if (!client) return { ok: false, error: getMissingServiceRoleMessage() };

  const postId = String(id || "").trim();
  if (!postId) return { ok: false, error: "معرّف المقال مطلوب للمراجعة." };

  const normalizedDecision = decision === "reject" ? "rejected" : "published";
  const payload = {
    status: normalizedDecision,
    review_note: String(reviewNote || "").trim() || null,
    reviewed_at: new Date().toISOString(),
    published_at: normalizedDecision === "published" ? new Date().toISOString() : null,
  };

  const { data, error } = await client
    .from(BLOG_WRITE_TABLE)
    .update(payload)
    .eq("id", postId)
    .select("id, slug, status")
    .maybeSingle();
  if (error) return { ok: false, error: formatSupabaseError(error) };

  return {
    ok: true,
    id: data?.id || postId,
    slug: data?.slug || null,
    status: data?.status || normalizedDecision,
  };
}

export async function getContributorPublicProfile(authorUserId, { limit = 24 } = {}) {
  if (!isSupabaseConfigured()) {
    return { contributor: null, posts: [], error: "Supabase غير مُعد" };
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return { contributor: null, posts: [], error: "Supabase client غير متاح" };
  }

  const normalizedAuthorId = String(authorUserId || "").trim();
  if (!normalizedAuthorId) {
    return { contributor: null, posts: [], error: null };
  }

  const { data, error } = await supabase
    .from(BLOG_PUBLIC_TABLE)
    .select(POST_LIST_COLUMNS)
    .eq("status", "published")
    .eq("author_user_id", normalizedAuthorId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Number(limit) || 24));

  if (error) {
    return { contributor: null, posts: [], error: formatSupabaseError(error) };
  }

  const posts = (data || []).map(normalizePost);
  if (!posts.length) {
    return { contributor: null, posts: [], error: null };
  }

  const contributor = {
    id: normalizedAuthorId,
    displayName: posts[0].authorDisplayName || "مساهم",
    avatarUrl: posts[0].authorAvatarUrl || "",
    postsCount: posts.length,
    lastPublishedAt: posts[0].publishedAt || posts[0].createdAt || null,
  };

  return { contributor, posts, error: null };
}
