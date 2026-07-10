import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import { formatArabicDate } from "@/lib/blog/render";

export default function PostGridCard({ post }) {
  const hasContributor = Boolean(post.authorUserId);

  return (
    <article className="overflow-hidden border border-slate-200 bg-white">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative h-52 bg-slate-100">
          <BlogImage
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 bg-red-700 px-2.5 py-1 text-xs font-bold text-white">
            {post.category || "مقال"}
          </span>
        </div>
        <div className="p-5 text-right">
          <div className="text-xs font-bold text-slate-500">
            {formatArabicDate(post.publishedAt || post.createdAt)}
          </div>
          <h2 className="mt-3 line-clamp-2 text-xl font-black leading-8 text-slate-950">
            {post.title}
          </h2>
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">
            {post.excerpt}
          </p>
        </div>
      </Link>

      {hasContributor ? (
        <div className="border-t border-slate-100 px-5 py-4 text-right">
          <Link href={`/contributors/${post.authorUserId}`} className="inline-flex items-center gap-3 text-right transition hover:text-red-700">
            <span className="relative h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {post.authorAvatarUrl ? (
                <BlogImage src={post.authorAvatarUrl} alt={post.authorDisplayName || "مساهم"} fill sizes="36px" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-black text-slate-500">
                  {String(post.authorDisplayName || "م").trim().charAt(0)}
                </span>
              )}
            </span>
            <span>
              <span className="block text-[11px] font-bold text-slate-400">المساهم</span>
              <span className="block text-sm font-black text-slate-800">{post.authorDisplayName || "مساهم"}</span>
            </span>
          </Link>
        </div>
      ) : null}
    </article>
  );
}
