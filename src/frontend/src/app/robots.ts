import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/marketing/"],
        disallow: [
          "/api/",
          "/dashboard",
          "/inbound",
          "/outbound",
          "/inventory",
          "/customers",
          "/companies",
          "/users",
          "/settings",
          "/integrations",
          "/reports",
          "/ai",
          "/storage-plants",
          "/locations",
          "/company",
          "/login",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
