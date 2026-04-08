import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/login",
          "/signup",
          "/reset-password",
          "/testimonials",
        ],
      },
    ],
    sitemap: "https://thryvegrowth.co/sitemap.xml",
  };
}
