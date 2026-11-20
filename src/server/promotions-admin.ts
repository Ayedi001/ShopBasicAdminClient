import type { z } from "zod";
import { prisma } from "./db";
import { badRequest } from "./errors";
import { recomputeAllPricing } from "./pricing";
import type { couponSchema, promotionSchema } from "@/lib/validation";

type PromotionInput = z.output<typeof promotionSchema>;
type CouponInput = z.output<typeof couponSchema>;

function promotionData(i: PromotionInput) {
  if (i.scope === "PRODUCTS" && !i.productIds.length) throw badRequest("VALIDATION", "Sélectionnez au moins un produit.");
  if (i.scope === "CATEGORIES" && !i.categoryIds.length) throw badRequest("VALIDATION", "Sélectionnez au moins une catégorie.");
  if (i.scope === "SUBCATEGORIES" && !i.subcategoryIds.length) throw badRequest("VALIDATION", "Sélectionnez au moins une sous-catégorie.");
  return {
    name: i.name,
    description: i.description,
    type: i.type,
    value: i.value,
    scope: i.scope,
    startsAt: i.startsAt,
    endsAt: i.endsAt,
    isActive: i.isActive,
  };
}

export async function savePromotion(input: PromotionInput, id?: string) {
  const data = promotionData(input);
  const promo = await prisma.$transaction(async (tx) => {
    const p = id ? await tx.promotion.update({ where: { id }, data }) : await tx.promotion.create({ data });
    await tx.promotionProduct.deleteMany({ where: { promotionId: p.id } });
    await tx.promotionCategory.deleteMany({ where: { promotionId: p.id } });
    await tx.promotionSubcategory.deleteMany({ where: { promotionId: p.id } });
    if (input.scope === "PRODUCTS") await tx.promotionProduct.createMany({ data: input.productIds.map((productId) => ({ promotionId: p.id, productId })) });
    if (input.scope === "CATEGORIES") await tx.promotionCategory.createMany({ data: input.categoryIds.map((categoryId) => ({ promotionId: p.id, categoryId })) });
    if (input.scope === "SUBCATEGORIES") {
      await tx.promotionSubcategory.createMany({ data: input.subcategoryIds.map((subcategoryId) => ({ promotionId: p.id, subcategoryId })) });
    }
    return p;
  });
  await recomputeAllPricing();
  return promo;
}

export async function deletePromotion(id: string) {
  await prisma.promotion.delete({ where: { id } });
  await recomputeAllPricing();
}

export async function saveCoupon(input: CouponInput, id?: string) {
  if (input.scope === "PRODUCTS" && !input.productIds.length) throw badRequest("VALIDATION", "Sélectionnez au moins un produit.");
  if (input.scope === "CATEGORIES" && !input.categoryIds.length) throw badRequest("VALIDATION", "Sélectionnez au moins une catégorie.");
  const clash = await prisma.coupon.findUnique({ where: { code: input.code } });
  if (clash && clash.id !== id) throw badRequest("DUPLICATE", "Ce code existe déjà.", { code: "Code déjà utilisé" });
  const data = {
    code: input.code,
    description: input.description,
    type: input.type,
    value: input.value,
    minOrderAmount: input.minOrderAmount,
    maxUses: input.maxUses ?? null,
    maxUsesPerUser: input.maxUsesPerUser ?? null,
    scope: input.scope,
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    isActive: input.isActive,
  };
  return prisma.$transaction(async (tx) => {
    const c = id ? await tx.coupon.update({ where: { id }, data }) : await tx.coupon.create({ data });
    await tx.couponProduct.deleteMany({ where: { couponId: c.id } });
    await tx.couponCategory.deleteMany({ where: { couponId: c.id } });
    if (input.scope === "PRODUCTS") await tx.couponProduct.createMany({ data: input.productIds.map((productId) => ({ couponId: c.id, productId })) });
    if (input.scope === "CATEGORIES") await tx.couponCategory.createMany({ data: input.categoryIds.map((categoryId) => ({ couponId: c.id, categoryId })) });
    return c;
  });
}
