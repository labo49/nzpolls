import type { Metadata } from "next";

export const SITE_URL = "https://nzpolls.vercel.app";
export const SITE_NAME = "Aotearoa – New Zealand Election 2026";
export const SITE_DESCRIPTION =
  "Independent, automatically-updated polling data for the 2026 New Zealand general election: a poll-of-polls average, preferred prime minister and leadership approval ratings, and an electorate-by-electorate outlook -- all sourced directly from publicly published polls, refreshed daily.";

/** Page title/description, mirrored into openGraph and twitter so a page
 * shared on its own (not just the homepage) gets an accurate social-card
 * preview rather than falling back to the root layout's generic one. Next
 * doesn't deep-merge a page's openGraph/twitter objects with the layout's --
 * defining either at all replaces the parent's entirely -- so the image and
 * card type have to be repeated here rather than left to inherit. */
export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      images: [{ url: "/og-image.jpg", width: 1024, height: 559, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.jpg"],
    },
  };
}
