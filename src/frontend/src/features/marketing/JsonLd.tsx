import {
  DEFAULT_DESCRIPTION,
  FAQ_ITEMS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

export function JsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description: DEFAULT_DESCRIPTION,
    email: "tirthsoni1810@gmail.com",
    sameAs: [] as string[],
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Warehouse Management System",
    operatingSystem: "Web",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/OnlineOnly",
      price: "0",
      priceCurrency: "USD",
      description: "Request a demo for pricing",
    },
    featureList: [
      "Multi-tenant 3PL warehouse management",
      "Inbound receiving",
      "Inventory by location and batch",
      "Outbound shipping and ship logs",
      "Permission-aware AI assistant",
      "Operational reports",
    ],
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Third-party logistics (3PL) providers",
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const payloads = [organization, software, website, faq];

  return (
    <>
      {payloads.map((payload, index) => (
        <script
          // eslint-disable-next-line react/no-danger
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
      ))}
    </>
  );
}
