"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import { formatArabicDate, estimateReadingTime } from "@/lib/blog/render";

function ContributorAvatar({ contributor, size = 120 }) {
  if (contributor.avatarUrl) {
    return (
      <div
        className="relative overflow-hidden rounded-full border-4 border-white/40 bg-white/10 shadow-[0_20px_60px_-20px_rgba(220,38,38,0.8)]"
        style={{ width: size, height: size }}
      >
        <BlogImage
          src={contributor.avatarUrl}
          alt={contributor.displayName}
          fill
          sizes={`${size}px`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full border-4 border-white/40 bg-[radial-gradient(circle_at_30%_30%,#ef4444_0%,#b91c1c_60%,#7f1d1d_100%)] font-black text-white shadow-[0_20px_60px_-20px_rgba(220,38,38,0.8)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {String(contributor.displayName || "م").trim().charAt(0)}
    </div>
  );
}

function PostCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block text-right">
      <div className="overflow-hidden rounded-lg border border-slate-200 transition-all hover:border-red-300 hover:shadow-lg">
        <div className="relative h-32 bg-slate-200">
          <BlogImage
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="200px"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        </div>
        <div className="p-3">
          <h4 className="line-clamp-2 text-sm font-bold text-slate-900 transition group-hover:text-red-700">
            {post.title}
          </h4>
          <p className="mt-1 text-xs text-slate-500">{formatArabicDate(post.publishedAt || post.createdAt)}</p>
        </div>
      </div>
    </Link>
  );
}

export default function ContributorProfileModal({ isOpen, onClose, contributor, posts = [], stats = {} }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !contributor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
        dir="rtl"
      >
        {/* خلفية متدرجة */}
        <div className="h-32 bg-gradient-to-l from-red-600 to-red-700"></div>

        {/* الزر إغلاق */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-white/90 p-2 hover:bg-white transition"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* محتوى المودال */}
        <div className="px-6 pb-8">
          {/* الصورة والمعلومات الأساسية */}
          <div className="flex flex-col items-center text-center -mt-16 relative z-10 pb-8 border-b border-slate-100">
            <ContributorAvatar contributor={contributor} size={140} />

            <h2 className="mt-6 text-3xl font-black text-slate-950">{contributor.displayName}</h2>
            <p className="mt-2 text-sm text-slate-500">ناشر معتمد في ويكيهات</p>

            {/* الإحصائيات */}
            <div className="mt-6 grid grid-cols-3 gap-4 w-full">
              <div className="rounded-2xl bg-red-50 p-4">
                <div className="text-2xl font-black text-red-700">{stats.postsCount || 0}</div>
                <div className="text-xs font-semibold text-red-600 mt-1">مقالة منشورة</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <div className="text-2xl font-black text-amber-700">{stats.reactionsCount || 0}</div>
                <div className="text-xs font-semibold text-amber-600 mt-1">تفاعل وإعجاب</div>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <div className="text-2xl font-black text-blue-700">{stats.viewsCount || 0}</div>
                <div className="text-xs font-semibold text-blue-600 mt-1">مشاهدة</div>
              </div>
            </div>

            {/* زر عرض الملف الكامل */}
            <Link
              href={`/contributors/${contributor.id}`}
              className="mt-6 inline-block rounded-full bg-red-700 hover:bg-red-800 text-white px-6 py-2.5 font-semibold transition"
            >
              عرض الملف الشخصي الكامل
            </Link>
          </div>

          {/* المقالات */}
          {posts && posts.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-black text-slate-950 mb-4">أحدث مقالاته</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {posts.slice(0, 6).map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {posts.length > 6 && (
                <div className="mt-4 text-center">
                  <Link
                    href={`/contributors/${contributor.id}`}
                    className="text-sm font-semibold text-red-700 hover:text-red-800 transition"
                  >
                    عرض جميع المقالات ({posts.length})
                  </Link>
                </div>
              )}
            </div>
          )}

          {(!posts || posts.length === 0) && (
            <div className="mt-8 text-center text-slate-500">
              <p className="text-sm">لا توجد مقالات منشورة بعد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
