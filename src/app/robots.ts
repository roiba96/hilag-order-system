import type { MetadataRoute } from "next";

// Private tool: disallow all crawlers. The noindex meta tag is in the root layout.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
