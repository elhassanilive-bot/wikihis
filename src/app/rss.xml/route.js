import { site } from "@/config/site";
import { listPosts } from "@/lib/blog/posts";
import { absoluteUrl, cleanText } from "@/lib/seo";

export const revalidate = 300;

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRssDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

export async function GET() {
  const posts = await listPosts({ limit: 50 });
  const latestDate = posts[0]?.updatedAt || posts[0]?.publishedAt || posts[0]?.createdAt || new Date().toISOString();

  const items = posts
    .filter((post) => post.slug)
    .map((post) => {
      const url = absoluteUrl(`/blog/${post.slug}`);
      const image = post.coverImageUrl ? absoluteUrl(post.coverImageUrl) : absoluteUrl("/icon.png");
      const description = cleanText(post.excerpt || post.content, site.description);

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${escapeXml(url)}</link>
          <guid isPermaLink="true">${escapeXml(url)}</guid>
          <description>${escapeXml(description)}</description>
          <pubDate>${escapeXml(formatRssDate(post.publishedAt || post.createdAt))}</pubDate>
          <category>${escapeXml(post.category || "Wikihat")}</category>
          <author>${escapeXml(`${site.supportEmail} (${post.authorDisplayName || site.officialName})`)}</author>
          <enclosure url="${escapeXml(image)}" type="image/png" />
        </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>${escapeXml(site.officialName)} - ويكيهات</title>
        <link>${escapeXml(site.url)}</link>
        <atom:link href="${escapeXml(absoluteUrl("/rss.xml"))}" rel="self" type="application/rss+xml" />
        <description>${escapeXml(site.description)}</description>
        <language>ar</language>
        <lastBuildDate>${escapeXml(formatRssDate(latestDate))}</lastBuildDate>
        <image>
          <url>${escapeXml(absoluteUrl("/icon.png"))}</url>
          <title>${escapeXml(site.officialName)}</title>
          <link>${escapeXml(site.url)}</link>
        </image>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
