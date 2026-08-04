import type { Metadata } from "next";
import { MarketingLanding } from "@/features/marketing/MarketingLanding";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  PRIMARY_KEYWORDS,
  SITE_URL,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  keywords: [...PRIMARY_KEYWORDS],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/marketing/hero-warehouse.jpg",
        alt: "LogiForge 3PL warehouse management software in a modern warehouse",
      },
    ],
  },
};

export default function HomePage() {
  return <MarketingLanding />;
}
