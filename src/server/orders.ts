import crypto from "node:crypto";
import type { Prisma } from "@/server/db";
import { prisma } from "./db";
import { badRequest, conflict, forbidden, notFound } from "./errors";
import { buildCartView, getCart } from "./cart";
import { computeShipping } from "./shipping";
import { consumeCoupon, evaluateCoupon } from "./coupons";
import { commitHold, holdStock, releaseHold, restock } from "./inventory";
import { refreshProductAggregates } from "./pricing";
import { notify } from "./notifications";
import { audit } from "./audit";
import { normalizePhone } from "@/lib/phone";
import { phoneConfig } from "./settings";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/lib/constants";
import type { SessionUser } from "./auth/session";
import type { checkoutSchema } from "@/lib/validation";
import type { z } from "zod";
import { formatMoney } from "@/lib/money";

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function randomCode(len: number) {
  const bytes = crypto.randomBytes(len);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
export function newOrderNumber(prefix = "CMD") {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${ymd}-${randomCode(5)}`;
}

type CheckoutInput = z.output<typeof checkoutSchema>;

/** Computes the authoritative order summary for the current cart (used by checkout preview AND placement). */
export async function quoteCheckout(user: SessionUser, input: Pick<CheckoutInput, "deliveryMethod" | "regionId" | "couponCode">, locale: string) {
  const cart = await getCart(false);
  const view = await buildCartView(cart?.id ?? null, locale, user.id);
  const lines = view.lines.filter((l) => l.issue !== "UNAVAILABLE");
  let couponDiscount = 0;
  let couponCode: string | null = null;
  let couponId: string | null = null;
  let couponError: string | null = null;
  const code = input.couponCode ?? view.couponCode;
  if (code && lines.length) {
    try {
      const c = await evaluateCoupon(code, user.id, lines.map((l) => ({ productId: l.productId, categoryId: l.categoryId, lineTotal: l.lineTotal })));
      couponDiscount = c.discount;
      couponCode = c.code;
      couponId = c.couponId;
    } catch (e) {
      couponError = (e as Error).message;
    }
  }
  const afterDiscount = Math.max(0, view.subtotal - couponDiscount);
  let shipping = { fee: 0, regionName: "", regionId: null as string | null, estimatedDays: null as string | null };
  let shippingError: string | null = null;
  try {
    shipping = await computeShipping(input.deliveryMethod, input.regionId || null, afterDiscount);
  } catch (e) {
    shippingError = (e as Error).message;
  }
  return {
    view,
    lines,
    subtotal: view.subtotal,
    promoSavings: view.promoSavings,
    couponDiscount,
    couponCode,
    couponId,
    couponError,
    shipping,
    shippingError,
    total: afterDiscount + shipping.fee,
  };
}

export async function placeOrder(user: SessionUser, input: CheckoutInput, locale: string) {
  const phone = normalizePhone(input.phone, await phoneConfig());
  if (!phone) throw badRequest("VALIDATION", "Téléphone invalide", { phone: "err.phone" });

  const quote = await quoteCheckout(user, input, locale);
  if (!quote.view.lines.length) throw badRequest("CART_EMPTY", "Votre panier est vide.");
  if (quote.view.hasIssues) {
    throw conflict("CART_CHANGED", "La disponibilité de certains articles a changé. Vérifiez votre panier.", { cart: quote.view });
  }
  if (input.couponCode && quote.couponError) throw badRequest("COUPON_INVALID", quote.couponError, { couponCode: quote.couponError });
  if (quote.shippingError) throw badRequest("SHIPPING", quote.shippingError, { regionId: "err.required" });
  if (input.expectedTotal != null && input.expectedTotal !== quote.total) {
    throw conflict("TOTAL_CHANGED", "Le total de la commande a changé.", { total: quote.total });
  }

  const productIds = [...new Set(quote.lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, category: { select: { name: true } } },
  });
  const catName = new Map(products.map((p) => [p.id, p.category.name]));
  const isPickup = input.deliveryMethod === "PICKUP";

  const order = await prisma.$transaction(
    async (tx) => {
      // 1. Hold stock for every line (atomic, oversell-proof)
      for (const line of quote.lines) {
        const ok = await holdStock(tx, line.variantId, line.quantity);
        if (!ok) {
          throw conflict("OUT_OF_STOCK", `Stock insuffisant pour « ${line.name}${line.sizeLabel ? " – " + line.sizeLabel : ""} ». Un autre client vient peut-être de le commander.`, {
            variantId: line.variantId,
          });
        }
      }

      // 2. Coupon usage (re-checked inside the transaction)
      if (quote.couponId) {
        const c = await tx.coupon.findUniqueOrThrow({ where: { id: quote.couponId } });
        if (c.maxUsesPerUser != null) {
          const used = await tx.couponRedemption.count({ where: { couponId: c.id, userId: user.id } });
          if (used >= c.maxUsesPerUser) throw badRequest("COUPON_USER_LIMIT", "Vous avez déjà utilisé ce code promo.");
        }
        await consumeCoupon(tx, c.id, c.maxUses);
      }

      // 3. Create order with immutable snapshots
      let created = null as null | { id: string; number: string };
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const number = newOrderNumber();
        const exists = await tx.order.findUnique({ where: { number }, select: { id: true } });
        if (exists) continue;
        created = await tx.order.create({
          data: {
            number,
            userId: user.id,
            status: "PENDING",
            stockState: "HELD",
            customerName: input.fullName,
            customerPhone: phone,
            customerEmail: user.email,
            deliveryMethod: input.deliveryMethod,
            address: isPickup ? "Retrait en boutique" : input.address,
            city: isPickup ? "-" : input.city,
            regionName: quote.shipping.regionName,
            regionId: quote.shipping.regionId,
            postalCode: input.postalCode,
            deliveryInstructions: input.deliveryInstructions,
            subtotal: quote.subtotal,
            discountTotal: quote.promoSavings + quote.couponDiscount,
            couponCode: quote.couponCode,
            couponDiscount: quote.couponDiscount,
            shippingFee: quote.shipping.fee,
            total: quote.total,
            paymentMethod: "CASH_ON_DELIVERY",
            locale,
            items: {
              create: quote.lines.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                productName: l.name,
                productSlug: l.slug,
                sku: l.sku,
                colorName: l.colorName,
                colorHex: l.colorHex,
                sizeLabel: l.sizeLabel,
                imageUrl: l.image,
                originalUnitPrice: l.basePrice,
                unitPrice: l.unitPrice,
                quantity: l.quantity,
                lineTotal: l.lineTotal,
                categoryName: catName.get(l.productId) ?? null,
              })),
            },
            history: {
              create: { toStatus: "PENDING", note: "Commande passée par le client", changedById: user.id, changedByName: user.fullName },
            },
          },
          select: { id: true, number: true },
        });
      }
      if (!created) throw new Error("Could not allocate order number");

      if (quote.couponId) {
        await tx.couponRedemption.create({
          data: { couponId: quote.couponId, userId: user.id, orderId: created.id, amount: quote.couponDiscount },
        });
      }

      // 4. Empty the cart
      if (quote.view.id) {
        await tx.cartItem.deleteMany({ where: { cartId: quote.view.id } });
        await tx.cart.update({ where: { id: quote.view.id }, data: { couponCode: null } });
      }

      // 5. Remember address
      if (input.saveAddress && !isPickup) {
        await tx.customerProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, address: input.address, city: input.city, regionId: input.regionId || null, postalCode: input.postalCode },
          update: { address: input.address, city: input.city, regionId: input.regionId || null, postalCode: input.postalCode },
        });
      }
      await tx.user.update({ where: { id: user.id }, data: { locale } });
      await notify(tx, user.id, "ORDER_PLACED", { number: created.number }, `/account/orders/${created.number}`);
      return created;
    },
    { timeout: 20_000, maxWait: 10_000 },
  );

  await refreshProductAggregates(productIds);
  return order;
}

// ─────────────── Administration ───────────────

export async function changeOrderStatus(
  orderId: string,
  to: OrderStatus,
  actor: SessionUser,
  opts: { note?: string | null; cancellationReason?: string | null },
) {
  if (to === "CANCELLED" && !actor.permissions.includes("orders.cancel")) {
    throw forbidden("Vous n'avez pas la permission d'annuler une commande.");
  }
  const result = await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, couponUse: true } });
      if (!order) throw notFound("Commande introuvable");
      const from = order.status as OrderStatus;
      if (from === to) throw badRequest("SAME_STATUS", "La commande a déjà ce statut.");
      if (!ORDER_TRANSITIONS[from].includes(to)) {
        throw badRequest("INVALID_TRANSITION", `Transition impossible : ${from} → ${to}`);
      }
      // Optimistic lock: status must not have changed meanwhile
      const now = new Date();
      const data: Prisma.OrderUpdateManyMutationInput = { status: to };
      if (to === "CONFIRMED") data.confirmedAt = now;
      if (to === "SHIPPED") data.shippedAt = now;
      if (to === "DELIVERED") data.deliveredAt = now;
      if (to === "CANCELLED") {
        data.cancelledAt = now;
        data.cancellationReason = opts.cancellationReason ?? null;
      }

      const items = order.items.filter((i) => i.variantId);
      if (from === "PENDING" && to !== "CANCELLED") {
        // Confirmation: held units become a permanent deduction
        for (const i of items) await commitHold(tx, i.variantId!, i.quantity, order.id, actor);
        data.stockState = "DEDUCTED";
      } else if (to === "CANCELLED" && order.stockState === "HELD") {
        for (const i of items) await releaseHold(tx, i.variantId!, i.quantity);
        data.stockState = "RELEASED";
      } else if (to === "CANCELLED" && order.stockState === "DEDUCTED") {
        for (const i of items) {
          await restock(tx, i.variantId!, i.quantity, "ORDER_CANCELLED", { orderId: order.id, actor, reason: opts.cancellationReason ?? "Annulation" });
        }
        data.stockState = "RESTOCKED";
      }

      const updated = await tx.order.updateMany({ where: { id: order.id, status: from }, data });
      if (updated.count !== 1) throw conflict("CONCURRENT_UPDATE", "La commande a été modifiée entre-temps. Rechargez la page.");

      // Best-seller counters follow committed sales
      if (data.stockState === "DEDUCTED") {
        for (const i of order.items) if (i.productId) await tx.product.update({ where: { id: i.productId }, data: { soldCount: { increment: i.quantity } } });
      }
      if (data.stockState === "RESTOCKED") {
        for (const i of order.items) if (i.productId) await tx.product.update({ where: { id: i.productId }, data: { soldCount: { decrement: i.quantity } } });
      }
      // Free the coupon use when an order is cancelled
      if (to === "CANCELLED" && order.couponUse) {
        await tx.couponRedemption.delete({ where: { id: order.couponUse.id } });
        await tx.coupon.update({ where: { id: order.couponUse.couponId }, data: { usedCount: { decrement: 1 } } });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: from,
          toStatus: to,
          note: to === "CANCELLED" ? [opts.cancellationReason, opts.note].filter(Boolean).join(" — ") : opts.note ?? null,
          changedById: actor.id,
          changedByName: actor.fullName,
        },
      });

      const extra =
        to === "SHIPPED" && order.deliveryCompany
          ? ` ${order.deliveryCompany}${order.trackingNumber ? " — " + order.trackingNumber : ""}`
          : to === "CANCELLED" && opts.cancellationReason
            ? ` ${opts.cancellationReason}`
            : "";
      await notify(tx, order.userId, `ORDER_${to}` as "ORDER_CONFIRMED", { number: order.number, extra }, `/account/orders/${order.number}`);
      await audit(actor, "order.status", "Order", order.id, { number: order.number, from, to, reason: opts.cancellationReason }, tx);
      return { productIds: [...new Set(order.items.map((i) => i.productId).filter(Boolean) as string[])] };
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
  await refreshProductAggregates(result.productIds);
}

export async function updateDeliveryInfo(
  orderId: string,
  input: { deliveryCompany?: string | null; trackingNumber?: string | null; deliveryNotes?: string | null; deliveredAt?: string | null },
  actor: SessionUser,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Commande introuvable");
  await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryCompany: input.deliveryCompany ?? null,
      trackingNumber: input.trackingNumber ?? null,
      deliveryNotes: input.deliveryNotes ?? null,
      ...(input.deliveredAt ? { deliveredAt: new Date(input.deliveredAt) } : {}),
    },
  });
  await audit(actor, "order.delivery", "Order", orderId, { ...input, number: order.number });
}

export async function addOrderNote(orderId: string, body: string, actor: SessionUser) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) throw notFound("Commande introuvable");
  return prisma.orderNote.create({ data: { orderId, body, authorId: actor.id, authorName: actor.fullName } });
}

export function orderSummaryText(o: { number: string; total: number }) {
  return `${o.number} — ${formatMoney(o.total)}`;
}
