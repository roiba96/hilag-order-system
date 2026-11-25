import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { BUSINESS } from "@/lib/config";
import "./globals.css";

// next/font self-hosts the font: the browser never calls Google.
const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: BUSINESS.name, template: `%s · ${BUSINESS.name}` },
  description: "ניהול הזמנות",
  // Private tool: keep it out of search engines.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  // iPhone "Add to Home Screen": open full screen with the HILAG name.
  appleWebApp: { title: BUSINESS.name, statusBarStyle: "default" },
  // Next.js 16 emits only the generic mobile-web-app-capable tag; iOS Safari still reads this one.
  other: { "apple-mobile-web-app-capable": "yes" },
  // The phone number and price formats must not turn into tap-to-call links on their own.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f1e8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
