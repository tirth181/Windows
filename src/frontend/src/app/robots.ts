import type { MetadataRoute } from "next";

/** Private preview — keep search engines out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
