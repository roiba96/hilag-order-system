import type { MetadataRoute } from "next";
import { BUSINESS } from "@/lib/config";

// Served at /manifest.webmanifest; Next.js links it from every page.
// Icons are generated from src/app/icon.svg by `npm run icons`.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BUSINESS.name} · הזמנות`,
    short_name: BUSINESS.name,
    description: "ניהול הזמנות",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#f7f1e8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // The donut sits inside the central safe zone, so the same file is maskable.
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
