import "./globals.css";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter";
import PwaRegistration from "@/components/PwaRegistration";
import Script from "next/script";
import { site } from "@/config/site";
import { buildJsonLdGraph, buildMetadata } from "@/lib/seo";

export const metadata = {
  ...buildMetadata({
    title: `${site.officialName} | ويكيهات`,
    description: site.description,
    path: "/",
    keywords: site.brandKeywords,
  }),
  manifest: "/manifest.webmanifest",
  title: {
    default: `${site.officialName} | ويكيهات`,
    template: `%s | ${site.officialName}`,
  },
  appleWebApp: {
    capable: true,
    title: site.officialName,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260702e", type: "image/x-icon", sizes: "256x256" },
      { url: "/icon.png?v=20260702e", type: "image/png", sizes: "1024x1024" },
      { url: "/icon.png?v=20260702e", type: "image/png", sizes: "1024x1024" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=20260702e", sizes: "512x512", type: "image/png" }],
    shortcut: ["/favicon.ico?v=20260702e"],
  },
};

export const viewport = {
  themeColor: site.themeColor,
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  const jsonLd = buildJsonLdGraph();

  return (
    <html lang="ar" dir="rtl">
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2700475642561219"
        strategy="beforeInteractive"
        crossOrigin="anonymous"
      />
      <body className="min-h-screen bg-background text-foreground font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <PwaRegistration />
        <Navbar />
        <main className="min-h-screen pt-[108px] md:pt-16">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}

