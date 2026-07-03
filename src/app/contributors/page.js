import ContributorHub from "@/components/blog/ContributorHub";
import { BLOG_CATEGORY_TREE } from "@/lib/blog/categories";
import { listContributorsPublic } from "@/lib/blog/posts";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = buildMetadata({
  title: "المساهمون",
  description: "تعرّف على المساهمين والناشرين في Wikihat، وشارك مقالاتك للمراجعة والنشر.",
  path: "/contributors",
  keywords: ["مساهمو Wikihat", "كتّاب ويكيهات", "النشر في Wikihat"],
});

export default async function ContributorsPage() {
  const { contributors } = await listContributorsPublic({ limit: 300 });

  return <ContributorHub contributors={contributors} categoryTree={BLOG_CATEGORY_TREE} />;
}
