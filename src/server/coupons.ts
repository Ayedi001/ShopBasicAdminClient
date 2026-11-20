import { prisma, type Tx } from "./db";
import { badRequest } from "./errors";

export type CouponLine = { productId: string; categoryId: string; lineTotal: number };

export type CouponResult = { couponId: string; code: string; discount: number; description: string | null };

const MESSAGES = {
  NOT_FOUND: "Code promo invalide.",
  INACTIVE: "Ce code promo n'est plus actif.",
  NOT_STARTED: "Ce code promo n'est pas encore valable.",
  EXPIRED: "Ce code promo a expiré.",
  EXHAUSTED: "Ce code promo a atteint son nombre maximal d'utilisations.",
  USER_LIMIT: "Vous avez déjà utilisé ce code promo.",
  MIN_AMOUNT: "Montant minimum de commande non atteint pour ce code ({amount} DT).",
  NOT_APPLICABLE: "Ce code ne s'applique à aucun article de votre panier.",
};

/** Backend coupon validation — the only place a coupon discount is computed. */
export async function evaluateCoupon(
  rawCode: string,
  userId: string | null,
  lines: CouponLine[],
  tx: Tx = prisma,
): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  const coupon = await tx.coupon.findUnique({ where: { code }, include: { products: true, categories: true } });
  const fail = (k: keyof typeof MESSAGES, vars?: Record<string, string>) => {
    let msg = MESSAGES[k];
    for (const [a, b] of Object.entries(vars ?? {})) msg = msg.replace(`{${a}}`, b);
    return badRequest("COUPON_" + k, msg);
  };
  if (!coupon) throw fail("NOT_FOUND");
  const now = new Date();
  if (!coupon.isActive) throw fail("INACTIVE");
  if (coupon.startsAt && coupon.startsAt > now) throw fail("NOT_STARTED");
  if (coupon.expiresAt && coupon.expiresAt <= now) throw fail("EXPIRED");
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) throw fail("EXHAUSTED");
  if (userId && coupon.maxUsesPerUser != null) {
    const used = await tx.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.maxUsesPerUser) throw fail("USER_LIMIT");
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  if (subtotal < coupon.minOrderAmount) throw fail("MIN_AMOUNT", { amount: String(coupon.minOrderAmount / 1000) });

  const productIds = new Set(coupon.products.map((p) => p.productId));
  const categoryIds = new Set(coupon.categories.map((c) => c.categoryId));
  const eligible = lines
    .filter((l) =>
      coupon.scope === "ALL" ? true : coupon.scope === "PRODUCTS" ? productIds.has(l.productId) : categoryIds.has(l.categoryId),
    )
    .reduce((s, l) => s + l.lineTotal, 0);
  if (eligible <= 0) throw fail("NOT_APPLICABLE");

  const discount = coupon.type === "PERCENT" ? Math.round((eligible * coupon.value) / 100) : Math.min(coupon.value, eligible);
  return { couponId: coupon.id, code: coupon.code, discount, description: coupon.description };
}

/** Atomically consume one use (fails if the limit was reached concurrently). */
export async function consumeCoupon(tx: Tx, couponId: string, maxUses: number | null) {
  const res = await tx.coupon.updateMany({
    where: { id: couponId, isActive: true, ...(maxUses != null ? { usedCount: { lt: maxUses } } : {}) },
    data: { usedCount: { increment: 1 } },
  });
  if (res.count !== 1) throw badRequest("COUPON_EXHAUSTED", MESSAGES.EXHAUSTED);
}
