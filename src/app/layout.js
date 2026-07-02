import "./globals.css";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter";
import PwaRegistration from "@/components/PwaRegistration";
import { site } from "@/config/site";

export const metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.nameEn,
  manifest: "/manifest.webmanifest",
  title: {
    default: `${site.name} | ${site.nameEn}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  appleWebApp: {
    capable: true,
    title: site.nameEn,
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: site.nameEn,
    title: `${site.name} | ${site.nameEn}`,
    description: site.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} | ${site.nameEn}`,
    description: site.description,
  },
};

export const viewport = {
  themeColor: "#b91c1c",
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
        alternateName: site.nameEn,
        url: site.url,
        logo: `${site.url}/icon.png`,
        email: site.supportEmail,
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        name: site.name,
        alternateName: site.nameEn,
        url: site.url,
        description: site.description,
        inLanguage: "ar",
        publisher: { "@id": `${site.url}/#organization` },
      },
    ],
  };

  return (
    <html lang="ar" dir="rtl">
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

