"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatArabicDate } from "@/lib/blog/render";
import { getSupabaseClient } from "@/lib/supabase/client";

function ModerationBadge({ status }) {
  const toneMap = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    published: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${toneMap[status] || "border-slate-200 bg-slate-50 text-slate-700"}`}>{status}</span>;
}

export default function MemberArticlesModerationPanel() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [flash, setFlash] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((post) => post.status === filter);
  }, [filter, posts]);

  useEffect(() => {
    let active = true;

    async function loadMemberPosts() {
      const supabase = await getSupabaseClient();
      if (!supabase || !active) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;
      setSessionReady(true);

      if (!session?.user) {
        setFlash("سجل الدخول بحساب الأدمن أولًا حتى تظهر مقالات الأعضاء المرسلة للمراجعة.");
        setPosts([]);
        return;
      }

      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, status, created_at, published_at, author_display_name, review_note")
        .not("author_user_id", "is", null)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setFlash(error.message);
        setPosts([]);
        return;
      }

      setPosts(data || []);
    }

    loadMemberPosts();
    return () => {
      active = false;
    };
  }, []);

  function reviewPost(id, decision) {
    startTransition(() => {
      getSupabaseClient().then(async (supabase) => {
        if (!supabase) {
          setFlash("ربط Supabase غير متاح.");
          return;
        }

        const payload = {
          status: decision === "approve" ? "published" : "rejected",
          reviewed_at: new Date().toISOString(),
          published_at: decision === "approve" ? new Date().toISOString() : null,
        };

        const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);

        if (error) {
          setFlash(error.message || "تعذر تحديث حالة المقال.");
          return;
        }

        setPosts((current) =>
          current.map((post) =>
            post.id === id
              ? {
                  ...post,
                  status: payload.status,
                  published_at: payload.published_at,
                }
              : post
          )
        );
        setFlash(decision === "approve" ? "تم قبول المقال ونشره." : "تم رفض المقال وإبقاؤه خارج النشر العام.");
        router.refresh();
      });
    });
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.35)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-500">إدارة مقالات الأعضاء</div>
          <h2 className="mt-1 text-2xl font-black text-slate-950">مراجعة مقالات المستخدمين</h2>
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-orange-300 focus:bg-white"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">بانتظار المراجعة</option>
          <option value="published">منشور</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      {flash ? <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-right text-sm text-slate-700">{flash}</div> : null}

      <div className="mt-6 space-y-4">
        {!sessionReady ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
            جارٍ التحقق من جلسة الأدمن وتحميل مقالات الأعضاء...
          </div>
        ) : filteredPosts.length ? (
          filteredPosts.map((post) => (
            <article key={post.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <ModerationBadge status={post.status} />
                    <div className="text-xs font-semibold text-slate-500">{post.authorDisplayName || "مساهم"}</div>
                    <div className="text-xs text-slate-400">{formatArabicDate(post.createdAt)}</div>
                  </div>
                  <h3 className="mt-3 text-xl font-black text-slate-950">{post.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                  {post.reviewNote ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{post.reviewNote}</div> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {post.status === "published" ? (
                    <Link
                      href={`/blog/${post.slug}`}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                    >
                      عرض
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => reviewPost(post.id, "approve")}
                    disabled={isPending}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    قبول
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewPost(post.id, "reject")}
                    disabled={isPending}
                    className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    رفض
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
            لا توجد مقالات أعضاء مطابقة للحالة الحالية.
          </div>
        )}
      </div>
    </section>
  );
}
