import type {MetadataRoute} from "next";
import {projects} from "./projects";
import {getSiteUrl} from "@/lib/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const staticRoutes = [
    {path: "/", priority: 1, changeFrequency: "weekly" as const},
    {path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" as const},
    {path: "/confidentialite", priority: 0.3, changeFrequency: "yearly" as const},
    {path: "/cgu", priority: 0.3, changeFrequency: "yearly" as const},
  ];

  return [
    ...staticRoutes.map(({path, ...entry}) => ({
      url: new URL(path, siteUrl).toString(),
      ...entry,
    })),
    ...projects.map((project) => ({
      url: new URL(`/dataviz/${project.slug}`, siteUrl).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
