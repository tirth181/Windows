import type { Metadata, Viewport } from "next";
import { Manrope, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Fynvo — Invoices & Budgets",
    template: "%s · Fynvo",
  },
  description:
    "Original invoicing and budgeting for freelancers, families, and companies. Subscribe on web, App Store, and Google Play.",
  applicationName: "Fynvo",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Fynvo",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Fynvo — Invoices & Budgets",
    description: "Create invoices, track expenses, and budget for personal, family, or company life.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f6e56",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
