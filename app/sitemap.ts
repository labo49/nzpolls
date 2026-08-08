import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import meta from "@/data/meta.json";
import electoratesData from "@/data/electorates.json";
import approvalData from "@/data/approval.json";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: meta.fetchedAt, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/approval`, lastModified: approvalData.fetchedAt, changeFrequency: "daily", priority: 0.8 },
    {
      url: `${SITE_URL}/electorates`,
      lastModified: electoratesData.fetchedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
