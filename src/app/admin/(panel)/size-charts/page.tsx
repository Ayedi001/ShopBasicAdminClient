import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/admin/parts";
import { SizeChartsManager } from "@/components/admin/size-charts-manager";

export default async function SizeChartsPage() {
  await adminPage("categories.manage");
  const charts = await prisma.sizeChart.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true, categories: true, subcategories: true } } },
  });
  return (
    <>
      <PageHeader title="Guides des tailles" description="Tableaux de mesures affichés sur les fiches produits. Associez-les à une catégorie, une sous-catégorie ou directement à un produit." />
      <SizeChartsManager
        charts={charts.map((c) => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr ?? "",
          nameEn: c.nameEn ?? "",
          description: c.description ?? "",
          unit: c.unit,
          columns: safeJson<string[]>(c.columns, []),
          rows: safeJson<{ size: string; values: string[] }[]>(c.rows, []),
          usage: c._count.products + c._count.categories + c._count.subcategories,
        }))}
      />
    </>
  );
}
