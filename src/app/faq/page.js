import HelpCenterPageView from "@/components/HelpCenterPageView";
import { site } from "@/config/site";
import { buildJsonLdGraph, buildMetadata } from "@/lib/seo";
import { faqSections } from "./faqData";

export const metadata = buildMetadata({
  title: "الأسئلة الشائعة",
  description: "إجابات عملية حول الحسابات والنشر والمساهمين واستخدام Wikihat.",
  path: "/faq",
  keywords: ["أسئلة Wikihat", "مساعدة ويكيهات", "FAQ Wikihat"],
});

export default function FaqPage() {
  const faqJsonLd = buildJsonLdGraph([
    {
      "@type": "FAQPage",
      "@id": `${site.url}/faq#faq`,
      mainEntity: faqSections.flatMap((section) =>
        section.items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        }))
      ),
    },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HelpCenterPageView />
    </>
  );
}
