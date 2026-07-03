import { site } from "@/config/site";

export const DEFAULT_OG_IMAGE = "/icon.png";
export const DEFAULT_KEYWORDS = [
  ...site.brandKeywords,
  "مقالات عربية",
  "أخبار",
  "موسوعة عربية",
  "مجلة عربية",
  "مساهمون",
  "تكنولوجيا",
  "الصحة واللياقة",
  "البيت والأسرة",
  "المجتمع",
];

export function absoluteUrl(path = "/") {
  if (!path) return site.url;
  try {
    return new URL(path, site.url).toString();
  } catch {
    return site.url;
  }
}

export function cleanText(value, fallback = "") {
  return String(value || fallback || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(value, maxLength = 155) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

export function buildPageTitle(title) {
  const cleanTitle = cleanText(title);
  if (!cleanTitle) return `${site.officialName} | ويكيهات`;
  if (cleanTitle.includes(site.officialName) || cleanTitle.includes(site.name)) return cleanTitle;
  return `${cleanTitle} | ${site.officialName}`;
}

export function buildKeywords(keywords = []) {
  return [...new Set([...DEFAULT_KEYWORDS, ...keywords].map((item) => cleanText(item)).filter(Boolean))];
}

export function buildMetadata({
  title,
  description = site.description,
  path = "/",
  type = "website",
  image = DEFAULT_OG_IMAGE,
  imageAlt,
  keywords = [],
  robots,
  publishedTime,
  modifiedTime,
  authors,
  section,
  category,
} = {}) {
  const canonical = absoluteUrl(path);
  const metaTitle = buildPageTitle(title);
  const metaDescription = truncateText(description || site.description, 170);
  const imageUrl = absoluteUrl(image || DEFAULT_OG_IMAGE);
  const authorNames = Array.isArray(authors) && authors.length ? authors : [site.officialName];

  return {
    metadataBase: new URL(site.url),
    applicationName: site.officialName,
    generator: "Next.js",
    referrer: "origin-when-cross-origin",
    creator: site.officialName,
    publisher: site.officialName,
    authors: authorNames.map((name) => ({ name })),
    category: category || section || "Arabic digital publication",
    title: metaTitle,
    description: metaDescription,
    keywords: buildKeywords(keywords),
    robots: robots || {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical,
      languages: {
        ar: canonical,
        "x-default": canonical,
      },
      types: {
        "application/rss+xml": absoluteUrl("/rss.xml"),
      },
    },
    openGraph: {
      type,
      locale: site.locale,
      siteName: site.officialName,
      title: metaTitle,
      description: metaDescription,
      url: canonical,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt || metaTitle,
        },
      ],
      publishedTime,
      modifiedTime,
      authors: authorNames,
      section,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: [imageUrl],
      creator: site.socials.x || undefined,
      site: site.socials.x || undefined,
    },
  };
}

export function buildBreadcrumbJsonLd(items = []) {
  const list = items.filter(Boolean).map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.url || "/"),
  }));

  return {
    "@type": "BreadcrumbList",
    itemListElement: list,
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.officialName,
    alternateName: site.brandKeywords,
    url: site.url,
    logo: {
      "@type": "ImageObject",
      "@id": `${site.url}/#logo`,
      url: absoluteUrl("/icon.png"),
      width: 1024,
      height: 1024,
    },
    image: absoluteUrl("/icon.png"),
    email: site.supportEmail,
    sameAs: Object.values(site.socials).filter(Boolean),
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.officialName,
    alternateName: site.brandKeywords,
    url: site.url,
    description: site.description,
    inLanguage: site.language,
    publisher: { "@id": `${site.url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${site.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildJsonLdGraph(nodes = []) {
  return {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationJsonLd(), buildWebsiteJsonLd(), ...nodes.filter(Boolean)],
  };
}
