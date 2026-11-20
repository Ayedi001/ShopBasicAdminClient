import type { MetadataRoute } from "next";
import { prisma } from "@/server/db";
import { CONTENT_PAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const [products, categories, collections] = await Promise.all([
    prisma.product.findMany({ where: { status: "PUBLISHED", category: { isActive: true } }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, include: { subcategories: { where: { isActive: true }, select: { slug: true } } } }),
    prisma.collection.findMany({ where: { isActive: true }, select: { slug: true } }),
  ]);
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...categories.flatMap((c) => [
      { url: `${base}/c/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
      ...c.subcategories.map((s) => ({ url: `${base}/c/${c.slug}/${s.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
    ]),
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...CONTENT_PAGES.map((s) => ({ url: `${base}/pages/${s}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.3 })),
    { url: `${base}/size-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
