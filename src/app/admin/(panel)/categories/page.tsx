import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/admin/parts";
import { CategoriesManager } from "@/components/admin/categories-manager";

export default async function CategoriesPage() {
  await adminPage("categories.manage");
  const [categories, sizeCharts, productCounts] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { subcategories: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } } }),
    prisma.sizeChart.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.groupBy({ by: ["subcategoryId"], _count: true }),
  ]);
  const subCount = Object.fromEntries(productCounts.map((p) => [p.subcategoryId ?? "", p._count]));
  return (
    <>
      <PageHeader title="Catégories" description="Rayons principaux (Homme, Femme, Enfant…) et leurs sous-catégories, affichés dans le menu de la boutique." />
      <CategoriesManager
        sizeCharts={sizeCharts}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr ?? "",
          nameEn: c.nameEn ?? "",
          slug: c.slug,
          audience: c.audience,
          description: c.description ?? "",
          imageUrl: c.imageUrl ?? "",
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          sizeChartId: c.sizeChartId ?? "",
          productCount: c._count.products,
          subcategories: c.subcategories.map((s) => ({
            id: s.id,
            categoryId: s.categoryId,
            name: s.name,
            nameAr: s.nameAr ?? "",
            nameEn: s.nameEn ?? "",
            slug: s.slug,
            productType: s.productType ?? "",
            sizeType: s.sizeType,
            imageUrl: s.imageUrl ?? "",
            sortOrder: s.sortOrder,
            isActive: s.isActive,
            sizeChartId: s.sizeChartId ?? "",
            productCount: subCount[s.id] ?? 0,
          })),
        }))}
      />
    </>
  );
}
