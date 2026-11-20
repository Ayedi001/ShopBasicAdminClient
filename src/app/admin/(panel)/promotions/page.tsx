import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/admin/parts";
import { PromotionsManager } from "@/components/admin/promotions-manager";

export default async function PromotionsPage() {
  await adminPage("promotions.manage");
  const [promotions, coupons, categories, subcategories, products] = await Promise.all([
    prisma.promotion.findMany({
      orderBy: { createdAt: "desc" },
      include: { products: true, categories: true, subcategories: true },
    }),
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { products: true, categories: true },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.subcategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, categoryId: true } }),
    prisma.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, take: 500, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Promotions & coupons"
        description="Les promotions mettent à jour automatiquement les prix promo des produits ciblés. Les coupons s'appliquent au panier au checkout."
      />
      <PromotionsManager
        promotions={promotions.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          type: p.type,
          value: p.value,
          scope: p.scope,
          startsAt: p.startsAt?.toISOString() ?? null,
          endsAt: p.endsAt?.toISOString() ?? null,
          isActive: p.isActive,
          productIds: p.products.map((x) => x.productId),
          categoryIds: p.categories.map((x) => x.categoryId),
          subcategoryIds: p.subcategories.map((x) => x.subcategoryId),
        }))}
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          type: c.type,
          value: c.value,
          minOrderAmount: c.minOrderAmount,
          maxUses: c.maxUses,
          maxUsesPerUser: c.maxUsesPerUser,
          usedCount: c.usedCount,
          scope: c.scope,
          startsAt: c.startsAt?.toISOString() ?? null,
          expiresAt: c.expiresAt?.toISOString() ?? null,
          isActive: c.isActive,
          productIds: c.products.map((x) => x.productId),
          categoryIds: c.categories.map((x) => x.categoryId),
        }))}
        categories={categories}
        subcategories={subcategories}
        products={products}
      />
    </>
  );
}
