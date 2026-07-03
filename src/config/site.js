export const site = {
  name: "ويكيهات",
  nameEn: "Wikihat",
  officialName: "Wikihat",
  description:
    "Wikihat هو موقع عربي متعدد التخصصات يقدم مقالات وأخبارًا وشروحات موثوقة في التكنولوجيا، الصحة، الأسرة، المجتمع، الأخبار، والموضوعات العامة، مع مساحة للمساهمين لنشر مقالاتهم.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://wikihat.com",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@wikihat.com",
  locale: "ar_MA",
  language: "ar",
  themeColor: "#b91c1c",
  brandKeywords: [
    "Wikihat",
    "Wiki Hat",
    "wikihat",
    "wiki hat",
    "WikiHat",
    "ويكيهات",
    "ويكي هات",
    "قبعة الويكي",
  ],
  socials: {
    x: process.env.NEXT_PUBLIC_SOCIAL_X_URL || "",
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || "",
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL || "",
  },
};
