import { NextResponse } from "next/server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 10;

function pageBounds(page) {
  const safePage = Math.max(1, Number(page) || 1);
  const from = (safePage - 1) * PAGE_SIZE;
  return { safePage, from, to: from + PAGE_SIZE - 1 };
}

function sumViews(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row.view_count) || 0), 0);
}

function levelFromXp(xp) {
  const value = Number(xp) || 0;
  if (value >= 1000) return "بارز";
  if (value >= 500) return "متوسط";
  if (value >= 200) return "مبتدئ";
  return "جديد";
}

function rankFromPublished(count) {
  const value = Number(count) || 0;
  if (value >= 11) return "بارز";
  if (value >= 6) return "متوسط";
  if (value >= 3) return "مبتدئ";
  return "جديد";
}

async function countRows(client, tableName, buildQuery) {
  try {
    let query = client.from(tableName).select("id", { count: "exact", head: true });
    query = buildQuery ? buildQuery(query) : query;
    const { count, error } = await query;
    if (error) return 0;
    return Number(count) || 0;
  } catch {
    return 0;
  }
}

async function listRows(query) {
  const { data, error, count } = await query;
  if (error) return { rows: [], totalCount: 0, error: error.message };
  return { rows: data || [], totalCount: typeof count === "number" ? count : (data || []).length, error: null };
}

export async function GET(request) {
  const authClient = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminClient = isSupabaseAdminConfigured() ? await getSupabaseAdminClient() : null;
  const client = adminClient || authClient;
  const url = new URL(request.url);
  const userId = user.id;

  const postsPage = pageBounds(url.searchParams.get("postsPage"));
  const notificationsPage = pageBounds(url.searchParams.get("notificationsPage"));
  const commentsPage = pageBounds(url.searchParams.get("commentsPage"));
  const bookmarksPage = pageBounds(url.searchParams.get("bookmarksPage"));
  const bookmarkFolder = String(url.searchParams.get("bookmarkFolder") || "").trim();

  const [{ data: profile }, { data: allPosts }] = await Promise.all([
    client.from("user_profiles").select("display_name,email,avatar_url,total_xp").eq("id", userId).maybeSingle(),
    client.from("blog_posts").select("id,status,view_count,published_at,created_at").eq("author_user_id", userId).limit(5000),
  ]);

  const authoredPosts = Array.isArray(allPosts) ? allPosts : [];
  const authoredPostIds = authoredPosts.map((post) => post.id).filter(Boolean);
  const publishedCount = authoredPosts.filter((post) => post.status === "published").length;
  const pendingCount = authoredPosts.filter((post) => post.status === "pending").length;
  const rejectedCount = authoredPosts.filter((post) => post.status === "rejected").length;

  const [totalLikes, totalCommentsReceived, myCommentsCount, myBookmarksCount] = await Promise.all([
    authoredPostIds.length
      ? countRows(client, "blog_post_reactions", (query) => query.in("post_id", authoredPostIds).eq("reaction_type", "like"))
      : 0,
    authoredPostIds.length
      ? countRows(client, "blog_comments", (query) => query.in("post_id", authoredPostIds).eq("status", "published"))
      : 0,
    countRows(client, "blog_comments", (query) => query.eq("user_id", userId).eq("status", "published")),
    countRows(client, "blog_post_bookmarks", (query) => query.eq("user_id", userId)),
  ]);

  const stats = {
    published_count: publishedCount,
    pending_count: pendingCount,
    rejected_count: rejectedCount,
    total_views: sumViews(authoredPosts),
    total_likes: totalLikes,
    total_comments_received: totalCommentsReceived,
    my_comments_count: myCommentsCount,
    my_bookmarks_count: myBookmarksCount,
  };

  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday));
  const weeklyProgress = authoredPosts.filter((post) => {
    if (post.status !== "published" || !post.published_at) return false;
    return new Date(post.published_at).getTime() >= weekStart.getTime();
  }).length;
  const totalXp = Number(profile?.total_xp) || 0;
  const gamification = {
    total_xp: totalXp,
    level_label: levelFromXp(totalXp),
    rank_label: rankFromPublished(publishedCount),
    published_posts: publishedCount,
    weekly_goal: 5,
    weekly_progress: weeklyProgress,
    weekly_reward_xp: 150,
    weekly_claimed: false,
  };

  const memberPostsQuery = client
    .from("blog_posts")
    .select("id, slug, title, excerpt, status, created_at, review_note", { count: "exact" })
    .eq("author_user_id", userId)
    .order("created_at", { ascending: false })
    .range(postsPage.from, postsPage.to);

  const notificationsQuery = client
    .from("user_notifications")
    .select("id, type, title, body, data, is_read, created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(notificationsPage.from, notificationsPage.to);

  const commentsQuery = client
    .from("blog_comments")
    .select("id, content, created_at, post_id, parent_comment_id, blog_posts(title, slug)", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(commentsPage.from, commentsPage.to);

  let bookmarksQuery = client
    .from("blog_post_bookmarks")
    .select("id, folder, created_at, post_id, blog_posts(id, slug, title, excerpt, cover_image_url, category)", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (bookmarkFolder) bookmarksQuery = bookmarksQuery.eq("folder", bookmarkFolder);
  bookmarksQuery = bookmarksQuery.range(bookmarksPage.from, bookmarksPage.to);

  const [memberPosts, notifications, comments, bookmarks, foldersResult] = await Promise.all([
    listRows(memberPostsQuery),
    listRows(notificationsQuery),
    listRows(commentsQuery),
    listRows(bookmarksQuery),
    client.from("blog_post_bookmarks").select("folder").eq("user_id", userId).order("folder", { ascending: true }),
  ]);

  const bookmarkFolders = Array.from(
    new Set((foldersResult.data || []).map((row) => String(row.folder || "").trim()).filter(Boolean))
  );

  return NextResponse.json({
    profile: {
      displayName: profile?.display_name || user.user_metadata?.display_name || "",
      email: profile?.email || user.email || "",
      avatarUrl: profile?.avatar_url || "",
    },
    stats,
    gamification,
    memberPosts: { ...memberPosts, page: postsPage.safePage },
    notifications: { ...notifications, page: notificationsPage.safePage },
    comments: { ...comments, page: commentsPage.safePage },
    bookmarks: { ...bookmarks, page: bookmarksPage.safePage, folders: bookmarkFolders },
  });
}
