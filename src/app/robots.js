import { site } from "@/config/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/account",
          "/account/",
          "/auth",
          "/auth/",
          "/api/",
          "/_next/",
          "/*?*preview=",
        ],
      },
    ],
    sitemap: [`${site.url}/sitemap.xml`, `${site.url}/rss.xml`],
    host: site.url,
  };
}
