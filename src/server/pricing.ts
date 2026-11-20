import { prisma, type Tx } from "./db";
import { discountPercent } from "@/lib/money";

export type ActivePromotion = {
  id: string;
  name: string;
  type: string;
  value: number;
  scope: string;
  productIds: Set<string>;
  categoryIds: Set<string>;
  subcategoryIds: Set<string>;
};

let promoCache: { at: number; list: ActivePromotion[] } | null = null;
const PROMO_TTL = 30_000;

export function invalidatePromotionCache() {
  promoCache = null;
}

export async function getActivePromotions(): Promise<ActivePromotion[]> {
  if (promoCache && Date.now() - promoCache.at < PROMO_TTL) return promoCache.list;
  const now = new Date();
  const rows = await prisma.promotion.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    include: { products: true, categories: true, subcategories: true },
  });
  const list = rows.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    value: p.value,
    scope: p.scope,
    productIds: new Set(p.products.map((x) => x.productId)),
    categoryIds: new Set(p.categories.map((x) => x.categoryId)),
    subcategoryIds: new Set(p.subcategories.map((x) => x.subcategoryId)),
  }));
  promoCache = { at: Date.now(), list };
  return list;
}

type ProductPriceCtx = { id: string; categoryId: string; subcategoryId: string | null; price: number; salePrice: number | null };
type VariantPriceCtx = { price: number | null; salePrice: number | null } | null | undefined;

export type PriceInfo = { base: number; final: number; discountPct: number; promotion: string | null };

function promoApplies(p: ActivePromotion, product: ProductPriceCtx) {
  switch (p.scope) {
    case "ALL":
      return true;
    case "PRODUCTS":
      return p.productIds.has(product.id);
    case "CATEGORIES":
      return p.categoryIds.has(product.categoryId);
    case "SUBCATEGORIES":
      return !!product.subcategoryId && p.subcategoryIds.has(product.subcategoryId);
    default:
      return false;
  }
}

/**
 * Single source of truth for the unit price a customer pays.
 * - base: variant price override, otherwise product price
 * - sale price: variant sale price if the variant overrides price, otherwise product sale price
 * - automatic promotions apply to the base price; the best (lowest) result wins (no stacking)
 */
export function computePrice(product: ProductPriceCtx, variant: VariantPriceCtx, promos: ActivePromotion[]): PriceInfo {
  const base = variant?.price ?? product.price;
  const sale = variant?.price != null ? variant.salePrice : variant?.salePrice ?? product.salePrice;
  let final = sale != null && sale < base ? sale : base;
  let promotion: string | null = null;
  for (const p of promos) {
    if (!promoApplies(p, product)) continue;
    const candidate = p.type === "PERCENT" ? Math.round((base * (100 - p.value)) / 100) : Math.max(0, base - p.value);
    if (candidate < final) {
      final = candidate;
      promotion = p.name;
    }
  }
  return { base, final, discountPct: discountPercent(base, final), promotion };
}

/** Recomputes denormalised price/availability columns used for filtering & sorting. */
export async function refreshProductAggregates(productIds?: string[], tx: Tx = prisma) {
  const promos = await getActivePromotions();
  const products = await tx.product.findMany({
    where: productIds ? { id: { in: productIds } } : undefined,
    select: {
      id: true,
      categoryId: true,
      subcategoryId: true,
      price: true,
      salePrice: true,
      variants: { where: { isActive: true }, select: { price: true, salePrice: true, available: true } },
    },
  });
  for (const p of products) {
    const prices = p.variants.length ? p.variants.map((v) => computePrice(p, v, promos)) : [computePrice(p, null, promos)];
    const minPrice = Math.min(...prices.map((x) => x.final));
    const maxDiscountPct = Math.max(...prices.map((x) => x.discountPct));
    const totalAvailable = p.variants.reduce((s, v) => s + Math.max(0, v.available), 0);
    await tx.product.update({
      where: { id: p.id },
      data: { minPrice, maxDiscountPct, isDiscounted: maxDiscountPct > 0, totalAvailable },
    });
  }
}

/**
 * Promotions start/end on dates: when a boundary has passed since the last
 * computation, recompute denormalised prices (cheap check, run on catalog reads).
 */
const PRICING_KEY = "_pricingState";
let pricingCheckAt = 0;
export async function ensurePricingFresh() {
  if (Date.now() - pricingCheckAt < 60_000) return;
  pricingCheckAt = Date.now();
  const row = await prisma.setting.findUnique({ where: { key: PRICING_KEY } });
  const state = row ? (JSON.parse(row.value) as { nextBoundary: string | null }) : { nextBoundary: null };
  if (row && (!state.nextBoundary || new Date(state.nextBoundary) > new Date())) return;
  await recomputeAllPricing();
}

export async function recomputeAllPricing() {
  invalidatePromotionCache();
  await refreshProductAggregates();
  const now = new Date();
  const upcoming = await prisma.promotion.findMany({
    where: { isActive: true, OR: [{ startsAt: { gt: now } }, { endsAt: { gt: now } }] },
    select: { startsAt: true, endsAt: true },
  });
  const boundaries = upcoming
    .flatMap((p) => [p.startsAt, p.endsAt])
    .filter((d): d is Date => !!d && d > now)
    .sort((a, b) => a.getTime() - b.getTime());
  const value = JSON.stringify({ computedAt: now.toISOString(), nextBoundary: boundaries[0]?.toISOString() ?? null });
  await prisma.setting.upsert({ where: { key: PRICING_KEY }, create: { key: PRICING_KEY, value }, update: { value } });
}
