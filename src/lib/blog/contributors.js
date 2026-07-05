import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * جلب إحصائيات ومقالات المساهم
 * @param {string} contributorId - معرف المساهم
 * @returns {Promise<{stats: Object, posts: Array}>}
 */
export async function fetchContributorStats(contributorId) {
  try {
    // جلب المقالات المنشورة للمساهم
    const { data: posts, error: postsError } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_image_url, published_at, created_at, content")
      .eq("author_user_id", contributorId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(20);

    if (postsError) throw postsError;

    // جلب عدد المقالات الكلي
    const { count: postsCount } = await supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_user_id", contributorId)
      .eq("status", "published");

    // جلب عدد التفاعلات (الإعجابات)
    let reactionsCount = 0;
    if (posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { count: reactions } = await supabase
        .from("blog_post_reactions")
        .select("id", { count: "exact", head: true })
        .in("post_id", postIds);

      reactionsCount = reactions || 0;
    }

    // حساب عدد المشاهدات
    let viewsCount = 0;
    if (posts && posts.length > 0) {
      const { data: postStats } = await supabase
        .from("blog_posts")
        .select("view_count")
        .eq("author_user_id", contributorId)
        .eq("status", "published");

      if (postStats) {
        viewsCount = postStats.reduce((sum, post) => sum + (post.view_count || 0), 0);
      }
    }

    return {
      stats: {
        postsCount: postsCount || 0,
        reactionsCount,
        viewsCount,
      },
      posts: posts || [],
    };
  } catch (error) {
    console.error("خطأ في جلب بيانات المساهم:", error);
    return {
      stats: {
        postsCount: 0,
        reactionsCount: 0,
        viewsCount: 0,
      },
      posts: [],
    };
  }
}

/**
 * جلب بيانات المساهم من معرفه
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<Object>}
 */
export async function getContributorById(userId) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, email, display_name, avatar_url")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("خطأ في جلب بيانات المستخدم:", error);
    return null;
  }
}

/**
 * البحث عن مساهمين حسب الاسم
 * @param {string} searchTerm - الكلمة المراد البحث عنها
 * @returns {Promise<Array>}
 */
export async function searchContributors(searchTerm) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${searchTerm}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("خطأ في البحث عن المساهمين:", error);
    return [];
  }
}
