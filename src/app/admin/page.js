import Link from "next/link";
import { getAdminUserOrRedirect } from "@/lib/adminAuth";

export const metadata = {
  title: "لوحة الأدمن",
  description: "لوحة إدارة موقع Wikihat.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/admin" },
};

export default async function AdminHome() {
  await getAdminUserOrRedirect();

  return (
    <div className="w-full">
      <section className="w-full bg-gradient-to-br from-red-50 to-rose-100 py-14 dark:from-gray-900 dark:to-gray-800 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white">لوحة الأدمن</h1>
            <p className="mt-4 text-xl text-gray-700 dark:text-gray-300">
              هذه اللوحة متاحة فقط للحسابات الإدارية المصرح بها.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-14 dark:bg-gray-950 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-10 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">المدونة</h2>
              <p className="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
                إنشاء وكتابة ونشر المقالات بمحرر متقدم مع معاينة فورية.
              </p>
              <div className="mt-8 flex gap-4">
                <Link
                  href="/admin/blog"
                  className="inline-flex items-center justify-center rounded-lg bg-red-700 px-8 py-3 font-semibold text-white transition-colors hover:bg-red-800"
                >
                  محرر المقالات
                </Link>
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-8 py-3 font-semibold text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  عرض المدونة
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-10 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">إعدادات</h2>
              <p className="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
                هذا المكان مخصص لإعدادات الموقع وروابط التواصل والبريد وملفات SEO.
              </p>
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                حاليًا الإعدادات موجودة في <code>.env.local</code> و <code>src/config/site.js</code>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
