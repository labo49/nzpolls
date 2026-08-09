import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import SiteHeader from "@/components/SiteHeader";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s — ${SITE_NAME}`,
    default: SITE_NAME,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "New Zealand election 2026",
    "NZ election poll of polls",
    "New Zealand opinion polls",
    "preferred prime minister poll",
    "New Zealand electorates",
    "NZ election forecast",
    "Aotearoa election",
    "MMP seat projection",
  ],
  authors: [{ name: "Ilan Boock" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_NZ",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og-image.jpg", width: 1024, height: 559, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

// Structured data for search engines and AI answer engines: identifies this
// as a sourced, regularly-updated dataset (not commentary/opinion), and
// where it comes from -- the kind of provenance signal both traditional SEO
// and answer-engine citation tend to weight.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en-NZ",
      publisher: { "@id": `${SITE_URL}/#author` },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#author`,
      name: "Ilan Boock",
    },
    {
      "@type": "Dataset",
      name: "New Zealand 2026 general election opinion polling",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      creator: { "@id": `${SITE_URL}/#author` },
      spatialCoverage: { "@type": "Place", name: "New Zealand" },
      temporalCoverage: "2023-10-14/..",
      isBasedOn: "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_New_Zealand_general_election",
      license: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The inline script below sets this class before first paint based on
      // the saved choice / OS preference; React never sees that mutation
      // during its own render, so it would otherwise warn about a mismatch.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          // Own static object, no user input -- safe to inject directly.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white dark:focus:bg-neutral-100 dark:focus:text-neutral-900"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <SiteHeader />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
