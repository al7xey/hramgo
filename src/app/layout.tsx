import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";

import "./globals.css";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/layout/app-shell";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap"
});

const siteUrl = "https://hramgo.ru";
const siteDescription =
  "HramGo помогает найти православные храмы Москвы: адреса, ближайшее метро, расписания богослужений, контакты, фото и карту.";

const themeInitScript = `
try {
  var theme = localStorage.getItem("hramgo-theme") || "light";
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var isDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.dataset.theme = theme;
} catch (_) {}
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "HramGo",
  title: {
    default: "HramGo - храмы Москвы рядом",
    template: "%s | HramGo"
  },
  description: siteDescription,
  keywords: [
    "храмы Москвы",
    "православные храмы Москвы",
    "храм рядом",
    "расписание богослужений",
    "РПЦ Москва",
    "церкви Москвы",
    "карта храмов Москвы"
  ],
  alternates: {
    canonical: siteUrl
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" }
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  openGraph: {
    title: "HramGo - храмы Москвы рядом",
    description: siteDescription,
    url: siteUrl,
    siteName: "HramGo",
    locale: "ru_RU",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HramGo — храмы Москвы" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "HramGo - храмы Москвы рядом",
    description: siteDescription,
    images: ["/twitter-image"]
  },
  creator: "HramGo",
  publisher: "HramGo",
  category: "directory",
  verification: {
    google: "7pP8sbvL3oo0sTFTorRKUe_AKBK4Q4j8_SxbcmQUJME"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#081522" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "HramGo",
        url: siteUrl,
        inLanguage: "ru-RU",
        description: siteDescription,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/temples?query={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "HramGo",
        url: siteUrl,
        logo: `${siteUrl}/icon-512.png`
      }
    ]
  };

  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
