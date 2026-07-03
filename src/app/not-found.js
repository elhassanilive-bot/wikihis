import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "الصفحة غير موجودة",
  description: "لم يتم العثور على الصفحة المطلوبة في Wikihat. يمكنك العودة إلى الرئيسية أو البحث في المقالات.",
  path: "/404",
  robots: { index: false, follow: true },
});

export default function NotFound() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20 text-right sm:px-6 lg:px-8">
      <div className="border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <div className="text-xs font-black tracking-[0.2em] text-red-700">404</div>
        <h1 className="mt-3 text-4xl font-black text-slate-950">الصفحة غير موجودة</h1>
        <p className="mt-4 text-base leading-8 text-slate-600">
          الرابط الذي فتحته غير متاح حاليًا. جرّب البحث في Wikihat أو العودة إلى الصفحة الرئيسية.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800">
            الرئيسية
          </Link>
          <Link href="/search" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700">
            البحث
          </Link>
        </div>
      </div>
    </section>
  );
}
