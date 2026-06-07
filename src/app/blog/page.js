import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "مدونة ويكيهيس",
  description: "أرشيف مقالات ويكيهيس متاح من الصفحة الرئيسية مع أحدث المقالات والتصنيفات.",
  alternates: { canonical: "/" },
};

export default async function BlogIndexRedirect({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();

  if (resolvedSearchParams?.page) {
    params.set("page", String(resolvedSearchParams.page));
  }

  if (resolvedSearchParams?.category) {
    params.set("category", String(resolvedSearchParams.category));
  }

  const query = params.toString();
  redirect(query ? `/?${query}` : "/");
}

