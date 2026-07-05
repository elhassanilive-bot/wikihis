"use client";

import { useState } from "react";
import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import { formatArabicDate } from "@/lib/blog/render";
import ContributorProfileModal from "@/components/blog/ContributorProfileModal";
import { fetchContributorStats } from "@/lib/blog/contributors";

function getContributorTier(postsCount) {
  const count = Number(postsCount) || 0;

  if (count >= 5) {
    return {
      label: "بارز",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (count >= 2) {
    return {
      label: "مبتدئ",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "جديد",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  };
}

function ContributorAvatar({ contributor, size = 60, onClick }) {
  const isClickable = !!onClick;

  if (contributor.avatarUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-full border-4 border-red-100 bg-white shadow-[0_12px_30px_-18px_rgba(220,38,38,0.6)] ${
          isClickable ? "cursor-pointer hover:shadow-[0_16px_40px_-18px_rgba(220,38,38,0.8)] transition" : ""
        }`}
        style={{ width: size, height: size }}
        onClick={onClick}
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
      className={`flex items-center justify-center rounded-full border-4 border-red-100 bg-[radial-gradient(circle_at_30%_30%,#ef4444_0%,#b91c1c_60%,#7f1d1d_100%)] font-black text-white shadow-[0_12px_30px_-18px_rgba(220,38,38,0.6)] ${
        isClickable ? "cursor-pointer hover:shadow-[0_16px_40px_-18px_rgba(220,38,38,0.8)] transition" : ""
      }`}
      style={{ width: size, height: size, fontSize: Math.max(16, Math.round(size * 0.34)) }}
      onClick={onClick}
    >
      {String(contributor.displayName || "م").trim().charAt(0)}
    </div>
  );
}

function ContributorSpotlightCard({ contributor, compact = false, onAvatarClick }) {
  const tier = getContributorTier(contributor.postsCount);

  return (
    <article
      dir="rtl"
      className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-red-200 hover:shadow-[0_20px_55px_-35px_rgba(15,23,42,0.25)]"
    >
      <div className="flex items-start justify-start gap-4">
        <ContributorAvatar
          contributor={contributor}
          size={compact ? 54 : 62}
          onClick={onAvatarClick}
        />
        <div className="min-w-0 flex-1 text-right">
          <div className="flex flex-col items-start gap-1 text-right">
            <div dir="rtl" className="text-sm font-semibold text-slate-500">
              {formatArabicDate(contributor.lastPublishedAt)}
            </div>
            <div className="min-w-0">
              <button
                onClick={onAvatarClick}
                className="text-left hover:text-red-700 transition font-black text-slate-950 w-full"
              >
                <div className={`truncate text-left ${compact ? "text-lg" : "text-xl"}`}>
                  {contributor.displayName}
                </div>
              </button>
              <div className="mt-1 text-sm text-slate-600">ناشر معتمد في ويكيهات</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${tier.className}`}>
              {tier.label}
            </span>
            <span className="text-xs font-semibold text-slate-400">{contributor.postsCount} مقالة</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ContributorsSpotlight({
  contributors = [],
  title = "الناشرون البارزون",
  description = "",
  limit = 6,
  compact = false,
  className = "",
}) {
  const items = contributors.slice(0, limit);
  const [selectedContributor, setSelectedContributor] = useState(null);
  const [contributorStats, setContributorStats] = useState({});
  const [contributorPosts, setContributorPosts] = useState({});
  const [loading, setLoading] = useState(false);

  const handleOpenProfile = async (contributor) => {
    setSelectedContributor(contributor);

    // جلب الإحصائيات والمقالات إذا لم تكن موجودة
    if (!contributorStats[contributor.id]) {
      setLoading(true);
      try {
        const { stats, posts } = await fetchContributorStats(contributor.id);
        setContributorStats((prev) => ({
          ...prev,
          [contributor.id]: stats,
        }));
        setContributorPosts((prev) => ({
          ...prev,
          [contributor.id]: posts,
        }));
      } catch (error) {
        console.error("خطأ في جلب بيانات المساهم:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!items.length) return null;

  return (
    <>
      <section className={className}>
        <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="text-right">
            {description ? <div className="text-xs font-semibold text-slate-500">{description}</div> : null}
            <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
          </div>
          <span className="h-6 w-1 shrink-0 bg-red-700" />
        </div>

        <div className={`grid gap-4 ${compact ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
          {items.map((contributor) => (
            <ContributorSpotlightCard
              key={contributor.id}
              contributor={contributor}
              compact={compact}
              onAvatarClick={() => handleOpenProfile(contributor)}
            />
          ))}
        </div>
      </section>

      {selectedContributor && (
        <ContributorProfileModal
          isOpen={!!selectedContributor}
          onClose={() => setSelectedContributor(null)}
          contributor={selectedContributor}
          posts={contributorPosts[selectedContributor.id] || []}
          stats={contributorStats[selectedContributor.id] || {}}
        />
      )}
    </>
  );
}
