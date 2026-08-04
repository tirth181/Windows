export const SITE_NAME = "LogiForge";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://logiforge.app";

export const PRIMARY_KEYWORDS = [
  "3PL warehouse management software",
  "3PL WMS",
  "third party logistics software",
  "multi-tenant WMS",
  "3PL inventory management",
  "warehouse management system for 3PLs",
  "AI warehouse management",
  "inbound outbound warehouse software",
  "3PL operations software",
  "best 3PL software",
] as const;

export const DEFAULT_TITLE =
  "LogiForge | Best 3PL Warehouse Management Software (WMS)";

export const DEFAULT_DESCRIPTION =
  "LogiForge is AI-powered 3PL warehouse management software for multi-client operators. Run inbound receiving, inventory, outbound shipping, reports, and permission-aware AI in one secure WMS.";

export const FAQ_ITEMS = [
  {
    question: "What is the best warehouse management software for 3PLs?",
    answer:
      "The best 3PL WMS isolates every customer’s inventory, supports inbound and outbound at scale, and gives supervisors real-time visibility. LogiForge is built specifically for multi-tenant third-party logistics operations with AI briefings that respect warehouse permissions.",
  },
  {
    question: "How is a 3PL WMS different from a standard warehouse system?",
    answer:
      "A 3PL WMS must manage many client companies in one platform with strict tenant isolation, customer-level reporting, and flexible billing-ready activity history. LogiForge uses row-level company isolation so each 3PL customer stays separate while your teams work from one command center.",
  },
  {
    question: "Can LogiForge handle inbound receiving and outbound shipping?",
    answer:
      "Yes. LogiForge covers dock receiving with batches, pallets, and locations; on-hand inventory by bin; outbound picks with tracking; attachments; and ship logs your customers can trust.",
  },
  {
    question: "Does LogiForge include AI for warehouse operations?",
    answer:
      "Yes. Supervisors can ask natural-language questions about inbound, delayed shipments, holds, and utilization. Answers are permission-aware so operators only see what their role allows.",
  },
  {
    question: "Is LogiForge secure enough to publish for enterprise 3PL customers?",
    answer:
      "LogiForge includes JWT authentication, login lockout, rate limits, security headers, HSTS, CSP, and multi-tenant data filters. Demo access is gated behind a request form so you control who enters the product.",
  },
] as const;
