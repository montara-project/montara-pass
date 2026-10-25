import type { MetadataRoute } from "next";

import { META_URL } from "@/lib/constants/meta";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pricing", "/changelog", "/contact", "/privacy", "/terms"].map((path) => ({
    url: `${META_URL}${path}`,
  }));
}
