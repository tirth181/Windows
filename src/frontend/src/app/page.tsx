import type { Metadata } from "next";
import { MarketingLanding } from "@/features/marketing/MarketingLanding";

export const metadata: Metadata = {
  title: "LogiForge — Warehouse command for modern 3PLs",
  description:
    "Enterprise AI-powered multi-tenant 3PL warehouse management. Receive, store, ship, and brief your floor with permission-aware AI.",
  openGraph: {
    title: "LogiForge — Warehouse command for modern 3PLs",
    description:
      "Receive, store, ship, and brief your floor — with AI that respects every permission boundary.",
    images: [{ url: "/marketing/hero-warehouse.jpg" }],
  },
};

export default function HomePage() {
  return <MarketingLanding />;
}
