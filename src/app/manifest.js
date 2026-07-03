import { site } from "@/config/site";

export default function manifest() {
  return {
    name: `${site.officialName} - ويكيهات`,
    short_name: site.officialName,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: site.themeColor,
    lang: site.language,
    dir: "rtl",
    categories: ["news", "education", "magazines", "productivity"],
    icons: [
      {
        src: "/icon.png?v=20260702e",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png?v=20260702e",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png?v=20260702e",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
