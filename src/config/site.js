export const site = {
  name: "ويكيهات",
  nameEn: "Wikihat",
  description:
    "ويكيهات هي جريدة إلكترونية عربية متعددة التخصصات تهتم بتقديم كل أنواع المجالات، وتوفر إمكانية نشر المقالات للمساهمين مما يجعلها بارزة من بين المواقع الأخرى.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@wikihat.com",
  socials: {
    x: process.env.NEXT_PUBLIC_SOCIAL_X_URL || "",
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || "",
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL || "",
  },
};
