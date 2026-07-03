import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "تسجيل الدخول مطلوب",
  description: "هذه الصفحة في Wikihat تحتاج إلى تسجيل الدخول قبل المتابعة.",
  path: "/unauthorized",
  robots: { index: false, follow: false },
});

export default function UnauthorizedPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-right sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-950">تسجيل الدخول مطلوب</h1>
      <p className="mt-4 leading-8 text-slate-600">هذه الصفحة تحتاج إلى حساب Wikihat نشط.</p>
      <Link href="/auth" className="mt-8 inline-flex rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800">
        تسجيل الدخول
      </Link>
    </section>
  );
}
