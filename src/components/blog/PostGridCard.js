import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import { formatArabicDate } from "@/lib/blog/render";

export default function PostGridCard({ post }) {
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
    </article>
  );
}
