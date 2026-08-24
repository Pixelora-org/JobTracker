import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/today",
        "/board",
        "/applications",
        "/contacts",
        "/follow-ups",
        "/resumes",
        "/strategy",
        "/jobs",
        "/friends",
        "/pods",
      ],
    },
  };
}
