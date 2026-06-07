import HelpCenterPageView from "@/components/HelpCenterPageView";
import { site } from "@/config/site";
import { faqSections } from "./faqData";

export const metadata = {
  title: `الأسئلة الشائعة | ${site.name}`,
  description: `إجابات عملية حول الحسابات والنشر والمساهمين واستخدام ${site.name}.`,
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
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
  };

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
