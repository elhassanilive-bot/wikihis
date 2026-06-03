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
  themeColor: "#7a560b",
  appleWebApp: {
    capable: true,
    title: site.nameEn,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260603a", type: "image/png", sizes: "32x32" },
      { url: "/icon.png?v=20260603a", type: "image/png", sizes: "192x192" },
      { url: "/icon.png?v=20260603a", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=20260603a", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico?v=20260603a"],
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

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-background text-foreground font-sans">
        <PwaRegistration />
        <Navbar />
        <main className="min-h-screen pt-16">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}

