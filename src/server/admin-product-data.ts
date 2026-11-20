import { prisma } from "./db";

/** Reference data needed by the product editor (select options, size systems, colours). */
export async function productEditorOptions() {
  const [categories, collections, sizeCharts, colors, sizes, materials, brands] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, audience: true, sizeChartId: true, subcategories: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, sizeType: true, sizeChartId: true } } },
    }),
    prisma.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.sizeChart.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.color.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, hex: true } }),
    prisma.size.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }], select: { id: true, label: true, type: true } }),
    prisma.material.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  return { categories, collections, sizeCharts, colors, sizes, materials: materials.map((m) => m.name), brands: brands.map((b) => b.name) };
}

export type ProductEditorOptions = Awaited<ReturnType<typeof productEditorOptions>>;
