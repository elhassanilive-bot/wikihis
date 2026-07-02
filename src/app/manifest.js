import { site } from "@/config/site";

export default function manifest() {
  return {
    name: `${site.name} - ${site.nameEn}`,
    short_name: site.nameEn,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#7a560b",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/icon.png?v=20260702c",
        sizes: "2048x2048",
        type: "image/png",
      },
      {
        src: "/icon.png?v=20260702c",
        sizes: "2048x2048",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png?v=20260702c",
        sizes: "720x720",
        type: "image/png",
      },
    ],
  };
}
