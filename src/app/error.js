"use client";

import Link from "next/link";

export default function ErrorPage({ reset }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20 text-right sm:px-6 lg:px-8">
      <div className="border border-red-200 bg-white p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <div className="text-xs font-black tracking-[0.2em] text-red-700">500</div>
        <h1 className="mt-3 text-4xl font-black text-slate-950">حدث خطأ مؤقت</h1>
        <p className="mt-4 text-base leading-8 text-slate-600">
          لم نتمكن من تحميل الصفحة الآن. يمكنك المحاولة مرة أخرى أو العودة إلى الرئيسية.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800">
            إعادة المحاولة
          </button>
          <Link href="/" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700">
            الرئيسية
          </Link>
        </div>
      </div>
    </section>
  );
}
